import type { Server } from "socket.io"
import { endSession, startSession } from "./sessionLogger"

export type ParticipantRole = "host" | "editor" | "viewer"

export interface Participant {
  id: string
  name: string
  color: string
  role: ParticipantRole
  status: "online" | "away"
}

export interface Room {
  participants: Map<string, Participant>
  creatorToken: string | null
  locked: boolean
  timerRunning: boolean
  remainingSeconds: number
  maxParticipants: number
}

export type Rooms = Map<string, Room>

export const COLORS = ["#5b7fff", "#ff5e7a", "#ffd166", "#3dffa0", "#a78bfa", "#f97316"]
export const rooms: Rooms = new Map()

export function createRoom(
  roomId: string,
  creatorToken: string | null | undefined,
  initialRemainingSeconds: unknown,
  maxParticipants: unknown
) {
  const room: Room = {
    participants: new Map(),
    creatorToken: creatorToken ?? null,
    locked: false,
    timerRunning: true,
    remainingSeconds: typeof initialRemainingSeconds === "number" ? initialRemainingSeconds : 3600,
    maxParticipants: typeof maxParticipants === "number" ? maxParticipants : 5,
  }

  rooms.set(roomId, room)
  startSession(roomId)
  return room
}

export function getOrCreateRoom(
  roomId: string,
  creatorToken: string | null | undefined,
  initialRemainingSeconds: unknown,
  maxParticipants: unknown
) {
  return rooms.get(roomId) ?? createRoom(roomId, creatorToken, initialRemainingSeconds, maxParticipants)
}

export function getAvailableColor(room: Room) {
  const usedColors = new Set(
    Array.from(room.participants.values()).map((participant) => participant.color)
  )

  return COLORS.find((color) => !usedColors.has(color)) ?? COLORS[0]
}

export function broadcastParticipants(io: Server, roomId: string, room: Room) {
  io.to(roomId).emit("participants:update", Array.from(room.participants.values()))
}

export async function saveReplay(roomId: string) {
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

export async function endRoomSession(io: Server, activeRooms: Rooms, roomId: string) {
  const room = activeRooms.get(roomId)
  if (!room) return

  room.timerRunning = false
  const replayId = await saveReplay(roomId)
  io.to(roomId).emit("session:ended", { replayId })
  io.in(roomId).socketsLeave(roomId)
  activeRooms.delete(roomId)
}

export function startRoomTimer(io: Server, activeRooms: Rooms) {
  return setInterval(() => {
    activeRooms.forEach((room, roomId) => {
      if (!room.timerRunning || room.remainingSeconds <= 0) return

      room.remainingSeconds -= 1
      if (room.remainingSeconds === 0) {
        io.to(roomId).emit("timer:ended")
        void endRoomSession(io, activeRooms, roomId)
        return
      }

      io.to(roomId).emit("timer:tick", { remainingSeconds: room.remainingSeconds })
    })
  }, 1000)
}
