import { createServer, IncomingMessage } from "http"
import type { Socket } from "net"
import { Server } from "socket.io"
import { WebSocketServer, type WebSocket } from "ws"
import { setupWSConnection } from "y-websocket/bin/utils"
import { registerChatHandlers } from "./handlers/chatHandlers"
import { registerCodeHandlers } from "./handlers/codeHandlers"
import { registerRoomHandlers } from "./handlers/roomHandlers"
import { registerTimerHandlers } from "./handlers/timerHandlers"
import { rooms, startRoomTimer } from "./roomManager"

const httpServer = createServer()
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGINS,
    methods: ["GET", "POST"],
  },
})

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

startRoomTimer(io, rooms)

io.on("connection", (socket) => {
  console.log("connected:", socket.id)

  registerRoomHandlers(io, socket, rooms)
  registerCodeHandlers(io, socket, rooms)
  registerChatHandlers(io, socket, rooms)
  registerTimerHandlers(io, socket, rooms)
})

const PORT = process.env.PORT ?? 3001

httpServer.listen(PORT, () => {
  console.log(`ws-server running on port ${PORT}`)
})
