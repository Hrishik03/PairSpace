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
  status: string
}

interface Room {
  participants: Map<string, Participant>
  creatorToken: string | null
  locked: boolean
}

const rooms = new Map<string, Room>()
const COLORS = ["#5b7fff", "#ff5e7a", "#ffd166", "#3dffa0", "#a78bfa", "#f97316"]

// ── Save replay via Next.js API ──
async function saveReplay(roomId: string) {
  const session = endSession(roomId)
  if (!session || session.events.length === 0) return

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
  } catch (err) {
    console.error("Failed to save replay:", err)
  }
}

// Socket.IO events
io.on("connection", (socket) => {
  console.log("connected:", socket.id)

  // Join room
  socket.on("room:join", ({ roomId, name, creatorToken, role = "editor" }, callback) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        participants: new Map(),
        creatorToken: creatorToken ?? null,
        locked: false,
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

    const assignedRole = isHost ? "host" : role
    const color = COLORS[room.participants.size % COLORS.length] ?? COLORS[0]

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
      callback({ success: true, locked: room.locked })
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

  // Typing status
  socket.on("user:typing", ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const participant = room.participants.get(socket.id)
    if (!participant) return

    participant.status = "typing..."
    io.to(roomId).emit("participants:update",
      Array.from(room.participants.values())
    )

    setTimeout(() => {
      if (room.participants.has(socket.id)) {
        participant.status = "online"
        io.to(roomId).emit("participants:update",
          Array.from(room.participants.values())
        )
      }
    }, 2000)
  })

  // ── Code execution ──
  socket.on("code:run", ({ roomId, output, exitCode, runtime }) => {
    const participant = rooms.get(roomId)?.participants.get(socket.id)
    logEvent(roomId, "run", participant?.name ?? "unknown", {
      output,
      exitCode,
      runtime,
    })
    io.to(roomId).emit("code:output", { output, exitCode, runtime })
  })

  // ── Language change ──
  socket.on("language:change", ({ roomId, language }) => {
    setSessionLanguage(roomId, language)
    const participant = rooms.get(roomId)?.participants.get(socket.id)
    logEvent(roomId, "language_change", participant?.name ?? "unknown", {
      language,
    })
    socket.to(roomId).emit("language:changed", { language })
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
  socket.on("session:end", ({ roomId, creatorToken }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (room.creatorToken !== creatorToken) return

    saveReplay(roomId)
    io.to(roomId).emit("session:ended")
    rooms.delete(roomId)
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
    socket.to(roomId).emit("notes:changed", { notes })
  })

  socket.on("timer:pause", ({ roomId, creatorToken }) => {
   const room = rooms.get(roomId)
   if (!room || room.creatorToken !== creatorToken) return
   io.to(roomId).emit("timer:paused")
  })

  socket.on("timer:resume", ({ roomId, creatorToken }) => {
    const room = rooms.get(roomId)
    if (!room || room.creatorToken !== creatorToken) return
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