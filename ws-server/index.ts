import { createServer, IncomingMessage } from "http"
import type { Socket } from "net"
import { Server } from "socket.io"
import { WebSocketServer, type WebSocket } from "ws"
import { startSession, logEvent, endSession, setSessionLanguage } from "./sessionLogger"
import { setupWSConnection } from "y-websocket/bin/utils"

const httpServer = createServer()

// ── Socket.IO ──
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

// ── Yjs WebSocket Server ──
const wss = new WebSocketServer({ noServer: true })

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  setupWSConnection(ws, req)
})

httpServer.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
  if (req.url?.startsWith("/yjs")) {
    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wss.emit("connection", ws, req)
    })
  }
})

// ── In-memory room state ──
interface Participant {
  id: string
  name: string
  color: string
  role: string
  status: "online" | "away"
}

interface Room {
  participants: Map<string, Participant>
  creatorToken: string | null
  locked: boolean
  timerRunning: boolean
  remainingSeconds: number
  maxParticipants: number
}

const rooms = new Map<string, Room>()

// ── Server-side timer tick ──
setInterval(() => {
  rooms.forEach((room, roomId) => {
    if (room.timerRunning && room.remainingSeconds > 0) {
      room.remainingSeconds -= 1
      if (room.remainingSeconds === 0) {
        io.to(roomId).emit("timer:ended")
        void endRoomSession(roomId)
        return
      }
      // Broadcast every second or every few seconds to keep in sync
      io.to(roomId).emit("timer:tick", { remainingSeconds: room.remainingSeconds })
    }
  })
}, 1000)
const COLORS = ["#5b7fff", "#ff5e7a", "#ffd166", "#3dffa0", "#a78bfa", "#f97316"]

function getAvailableColor(room: Room) {
  const usedColors = new Set(
    Array.from(room.participants.values()).map((participant) => participant.color)
  )

  return COLORS.find((color) => !usedColors.has(color)) ?? COLORS[0]
}

// ── Save replay via Next.js API ──
async function saveReplay(roomId: string) {
  const session = endSession(roomId)
  if (!session || session.events.length === 0) return null

  const durationS = Math.round((Date.now() - session.startTime) / 1000)
  const { nanoid } = await import("nanoid")
  const replayId = nanoid(10)

  try {
    await fetch("http://localhost:3000/api/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replayId,
        roomId,
        durationS,
        language: session.language ?? "typescript",
        log: session.events,
      }),
    })
    console.log(`Replay saved: ${replayId}`)
    return replayId
  } catch (err) {
    console.error("Failed to save replay:", err)
    return null
  }
}

async function endRoomSession(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) return

  room.timerRunning = false
  const replayId = await saveReplay(roomId)
  io.to(roomId).emit("session:ended", { replayId })
  io.in(roomId).socketsLeave(roomId)
  rooms.delete(roomId)
}

// Socket.IO events
io.on("connection", (socket) => {
  console.log("connected:", socket.id)

  // Join room
  socket.on("room:join", ({ roomId, name, creatorToken, role = "editor", initialRemainingSeconds, maxParticipants }, callback) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        participants: new Map(),
        creatorToken: creatorToken ?? null,
        locked: false,
        timerRunning: true,
        remainingSeconds: typeof initialRemainingSeconds === "number" ? initialRemainingSeconds : 3600,
        maxParticipants: typeof maxParticipants === "number" ? maxParticipants : 5,
      })
      startSession(roomId)
    }

    const room = rooms.get(roomId)!
    const isHost = room.creatorToken && room.creatorToken === creatorToken

    if (room.locked && !isHost) {
      if (typeof callback === "function") {
        callback({ error: "Room is locked" })
      }
      return
    }

    if (!isHost && room.participants.size >= room.maxParticipants) {
      if (typeof callback === "function") {
        callback({ error: "Room is full" })
      }
      return
    }

    // Server always determines role - never trust the client's role claim
    const assignedRole = isHost ? "host" : "editor"
    const color = getAvailableColor(room)

    const participant: Participant = {
      id: socket.id,
      name,
      color,
      role: assignedRole,
      status: "online",
    }

    room.participants.set(socket.id, participant)
    socket.join(roomId)
    socket.data.roomId = roomId
    socket.data.name = name

    logEvent(roomId, "join", name, { role: assignedRole })

    io.to(roomId).emit("participants:update",
      Array.from(room.participants.values())
    )

    if (typeof callback === "function") {
      callback({ success: true, locked: room.locked, timerRunning: room.timerRunning })
    }

    fetch("http://localhost:3000/api/participant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId,
      name,
      color,
      role: assignedRole,
    }),
  }).catch(err => console.error("Failed to save participant:", err))
  })

  // ── Code execution ──
  socket.on("code:run", ({ roomId, output, exitCode, runtime }) => {
    const room = rooms.get(roomId)
    const participant = room?.participants.get(socket.id)
    if (!participant || participant.role === "viewer") return

    logEvent(roomId, "run", participant.name, {
      output,
      exitCode,
      runtime,
    })
    io.to(roomId).emit("code:output", { 
      output, 
      exitCode, 
      runtime, 
      user: participant.name,
      color: participant.color 
    })
  })

  // ── Language change ──
  socket.on("language:change", ({ roomId, language, code, creatorToken }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (room.creatorToken !== creatorToken) return

    const participant = room.participants.get(socket.id)
    logEvent(roomId, "language_change", participant?.name ?? "unknown", { language })
    setSessionLanguage(roomId, language)
    // Broadcast to all clients including the host for uniform state
    io.to(roomId).emit("language:changed", { language, code })
  })

  // ── Role change (host only) ──
  socket.on("role:change", ({ roomId, creatorToken, targetId, newRole }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (room.creatorToken !== creatorToken) return

    const target = room.participants.get(targetId)
    if (!target) return

    target.role = newRole
    io.to(roomId).emit("participants:update",
      Array.from(room.participants.values())
    )
  })

  // ── Participant status (editors/viewers only) ──
  socket.on("participant:status", ({ roomId, status }: { roomId: string; status: "online" | "away" }) => {
    const room = rooms.get(roomId)
    const participant = room?.participants.get(socket.id)
    if (!room || !participant) return
    if (participant.role === "host") return
    if (status !== "online" && status !== "away") return

    participant.status = status
    io.to(roomId).emit("participants:update",
      Array.from(room.participants.values())
    )
  })

  // ── Lock room (host only) ──
  socket.on("room:lock", ({ roomId, creatorToken }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (room.creatorToken !== creatorToken) return
    room.locked = true
    io.to(roomId).emit("room:locked", true)
  })

  // ── Unlock room (host only) ──
  socket.on("room:unlock", ({ roomId, creatorToken }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (room.creatorToken !== creatorToken) return
    room.locked = false
    io.to(roomId).emit("room:locked", false)
  })

  // ── Kick participant (host only) ──
  socket.on("room:kick", ({ roomId, creatorToken, targetId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (room.creatorToken !== creatorToken) return

    const target = room.participants.get(targetId)
    if (!target) return

    room.participants.delete(targetId)
    io.to(targetId).emit("room:kicked")
    io.to(roomId).emit("participants:update",
      Array.from(room.participants.values())
    )
  })

  // ── End session (host only) ──
  socket.on("session:end", async ({ roomId, creatorToken }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (room.creatorToken !== creatorToken) return

    await endRoomSession(roomId)
  })

  // ── Chat message ──
  socket.on("chat:message", ({ roomId, text }) => {
    const participant = rooms.get(roomId)?.participants.get(socket.id)
    if (!participant) return

    logEvent(roomId, "chat", participant.name, { message: text })

    io.to(roomId).emit("chat:new", {
      text,
      user: participant.name,
      color: participant.color,
      timestamp: Date.now(),
    })
  })

  socket.on("notes:update", ({ roomId, notes }) => {
    const room = rooms.get(roomId)
    const participant = room?.participants.get(socket.id)
    if (!participant || participant.role === "viewer") return

    socket.to(roomId).emit("notes:changed", { notes })
  })

  socket.on("timer:pause", ({ roomId, creatorToken }) => {
   const room = rooms.get(roomId)
   if (!room || room.creatorToken !== creatorToken) return
   room.timerRunning = false
   io.to(roomId).emit("timer:paused")
  })

  socket.on("timer:resume", ({ roomId, creatorToken }) => {
    const room = rooms.get(roomId)
    if (!room || room.creatorToken !== creatorToken) return
    room.timerRunning = true
    io.to(roomId).emit("timer:resumed")
  })

  // ── Disconnect ──
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId
    if (!roomId) return

    const room = rooms.get(roomId)
    if (!room) return

    const participant = room.participants.get(socket.id)
    if (participant) {
      logEvent(roomId, "leave", participant.name, {})
    }

    room.participants.delete(socket.id)

    if (room.participants.size === 0) {
      saveReplay(roomId)
      rooms.delete(roomId)
      console.log(`Room ${roomId} ended — replay saving`)
    } else {
      // host migration
      const hasHost = Array.from(room.participants.values()).some(p => p.role === "host")
      if (!hasHost) {
        const nextHost = Array.from(room.participants.values())[0]
        if (nextHost) {
          nextHost.role = "host"
          room.creatorToken = nextHost.id
          console.log(`Host migrated to ${nextHost.name}`)
        }
      }

      io.to(roomId).emit("participants:update",
        Array.from(room.participants.values())
      )
    }
  })
})

httpServer.listen(3001, () => {
  console.log("ws-server running on port 3001")
})
