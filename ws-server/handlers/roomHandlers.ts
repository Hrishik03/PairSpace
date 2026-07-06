import type { Server, Socket } from "socket.io"
import { logEvent } from "../sessionLogger"
import {
  broadcastParticipants,
  endRoomSession,
  getAvailableColor,
  getOrCreateRoom,
  saveReplay,
  type Participant,
  type ParticipantRole,
  type Rooms,
} from "../roomManager"

type JoinRoomCallback = (response: {
  success?: boolean
  error?: string
  locked?: boolean
  timerRunning?: boolean
}) => void

export function registerRoomHandlers(io: Server, socket: Socket, rooms: Rooms) {
  socket.on(
    "room:join",
    (
      { roomId, name, creatorToken, initialRemainingSeconds, maxParticipants },
      callback?: JoinRoomCallback
    ) => {
      const room = getOrCreateRoom(roomId, creatorToken, initialRemainingSeconds, maxParticipants)
      const isHost = room.creatorToken !== null && room.creatorToken === creatorToken

      if (room.locked && !isHost) {
        callback?.({ error: "Room is locked" })
        return
      }

      if (!isHost && room.participants.size >= room.maxParticipants) {
        callback?.({ error: "Room is full" })
        return
      }

      const assignedRole: ParticipantRole = isHost ? "host" : "editor"
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
      broadcastParticipants(io, roomId, room)
      callback?.({ success: true, locked: room.locked, timerRunning: room.timerRunning })

      fetch("http://localhost:3000/api/participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          name,
          color,
          role: assignedRole,
        }),
      }).catch((err) => console.error("Failed to save participant:", err))
    }
  )

  socket.on(
    "role:change",
    ({
      roomId,
      creatorToken,
      targetId,
      newRole,
    }: {
      roomId: string
      creatorToken: string
      targetId: string
      newRole: ParticipantRole
    }) => {
      const room = rooms.get(roomId)
      if (!room || room.creatorToken !== creatorToken) return

      const target = room.participants.get(targetId)
      if (!target) return

      target.role = newRole
      broadcastParticipants(io, roomId, room)
    }
  )

  socket.on("room:lock", ({ roomId, creatorToken }: { roomId: string; creatorToken: string }) => {
    const room = rooms.get(roomId)
    if (!room || room.creatorToken !== creatorToken) return

    room.locked = true
    io.to(roomId).emit("room:locked", true)
  })

  socket.on("room:unlock", ({ roomId, creatorToken }: { roomId: string; creatorToken: string }) => {
    const room = rooms.get(roomId)
    if (!room || room.creatorToken !== creatorToken) return

    room.locked = false
    io.to(roomId).emit("room:locked", false)
  })

  socket.on(
    "room:kick",
    ({ roomId, creatorToken, targetId }: { roomId: string; creatorToken: string; targetId: string }) => {
      const room = rooms.get(roomId)
      if (!room || room.creatorToken !== creatorToken) return

      const target = room.participants.get(targetId)
      if (!target) return

      room.participants.delete(targetId)
      io.to(targetId).emit("room:kicked")
      broadcastParticipants(io, roomId, room)
    }
  )

  socket.on("session:end", async ({ roomId, creatorToken }: { roomId: string; creatorToken: string }) => {
    const room = rooms.get(roomId)
    if (!room || room.creatorToken !== creatorToken) return

    await endRoomSession(io, rooms, roomId)
  })

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
      void saveReplay(roomId)
      rooms.delete(roomId)
      console.log(`Room ${roomId} ended - replay saving`)
      return
    }

    const hasHost = Array.from(room.participants.values()).some((p) => p.role === "host")
    if (!hasHost) {
      const nextHost = Array.from(room.participants.values())[0]
      if (nextHost) {
        nextHost.role = "host"
        room.creatorToken = nextHost.id
        console.log(`Host migrated to ${nextHost.name}`)
      }
    }

    broadcastParticipants(io, roomId, room)
  })
}
