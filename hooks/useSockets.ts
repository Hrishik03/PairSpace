"use client"

import { useState } from "react"
import { io, Socket } from "socket.io-client"

let socket: Socket | null = null
const WS_SERVER_URL = process.env.NEXT_PUBLIC_WS_SERVER_URL ?? "http://localhost:3001"

function getSocket() {
  if (!socket) {
    socket = io(WS_SERVER_URL)
  }
  return socket
}

export function useSocket() {
  const [socketInstance] = useState<Socket | null>(() => getSocket())

  return socketInstance
}
