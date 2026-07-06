import type { Server, Socket } from "socket.io"
import { broadcastParticipants, type Rooms } from "../roomManager"

type UserStatus = "online" | "away"

function updateParticipantStatus(
  io: Server,
  socket: Socket,
  rooms: Rooms,
  { roomId, status }: { roomId: string; status: UserStatus }
) {
  const room = rooms.get(roomId)
  const participant = room?.participants.get(socket.id)
  if (!room || !participant) return
  if (participant.role === "host") return
  if (status !== "online" && status !== "away") return

  participant.status = status
  broadcastParticipants(io, roomId, room)
}

export function registerTimerHandlers(io: Server, socket: Socket, rooms: Rooms) {
  socket.on("timer:pause", ({ roomId, creatorToken }: { roomId: string; creatorToken: string }) => {
    const room = rooms.get(roomId)
    if (!room || room.creatorToken !== creatorToken) return

    room.timerRunning = false
    io.to(roomId).emit("timer:paused")
  })

  socket.on("timer:resume", ({ roomId, creatorToken }: { roomId: string; creatorToken: string }) => {
    const room = rooms.get(roomId)
    if (!room || room.creatorToken !== creatorToken) return

    room.timerRunning = true
    io.to(roomId).emit("timer:resumed")
  })

  socket.on("timer:sync", ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId)
    if (!room) return

    socket.emit("timer:tick", { remainingSeconds: room.remainingSeconds })
    socket.emit(room.timerRunning ? "timer:resumed" : "timer:paused")
  })

  socket.on("participant:status", (payload: { roomId: string; status: UserStatus }) => {
    updateParticipantStatus(io, socket, rooms, payload)
  })

  socket.on("user:status", (payload: { roomId: string; status: UserStatus }) => {
    updateParticipantStatus(io, socket, rooms, payload)
  })

  socket.on("user:typing", ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
    const participant = rooms.get(roomId)?.participants.get(socket.id)
    if (!participant) return

    socket.to(roomId).emit("user:typing", {
      userId: socket.id,
      user: participant.name,
      color: participant.color,
      isTyping,
    })
  })
}
