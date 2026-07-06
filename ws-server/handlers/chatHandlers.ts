import type { Server, Socket } from "socket.io"
import { logEvent } from "../sessionLogger"
import type { Rooms } from "../roomManager"

export function registerChatHandlers(io: Server, socket: Socket, rooms: Rooms) {
  socket.on("chat:message", ({ roomId, text }: { roomId: string; text: string }) => {
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
}
