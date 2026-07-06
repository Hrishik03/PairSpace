import type { Server, Socket } from "socket.io"
import { logEvent, setSessionLanguage } from "../sessionLogger"
import type { Rooms } from "../roomManager"

export function registerCodeHandlers(io: Server, socket: Socket, rooms: Rooms) {
  socket.on(
    "code:run",
    ({ roomId, output, exitCode, runtime }: { roomId: string; output: string; exitCode: number; runtime: number }) => {
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
        color: participant.color,
      })
    }
  )

  socket.on(
    "language:change",
    ({
      roomId,
      language,
      code,
      creatorToken,
    }: {
      roomId: string
      language: string
      code: string
      creatorToken: string
    }) => {
      const room = rooms.get(roomId)
      if (!room || room.creatorToken !== creatorToken) return

      const participant = room.participants.get(socket.id)
      logEvent(roomId, "language_change", participant?.name ?? "unknown", { language })
      setSessionLanguage(roomId, language)
      io.to(roomId).emit("language:changed", { language, code })
    }
  )

  socket.on("notes:update", ({ roomId, notes }: { roomId: string; notes: string }) => {
    const room = rooms.get(roomId)
    const participant = room?.participants.get(socket.id)
    if (!participant || participant.role === "viewer") return

    socket.to(roomId).emit("notes:changed", { notes })
  })
}
