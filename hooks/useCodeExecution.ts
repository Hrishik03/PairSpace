"use client"

import { useState } from "react"
import type { Socket } from "socket.io-client"

type UseCodeExecutionParams = {
  socket: Socket | null
  roomId: string
  code: string
  language: string
  stdin: string
}

export function useCodeExecution({
  socket,
  roomId,
  code,
  language,
  stdin,
}: UseCodeExecutionParams) {
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    if (running) return
    setRunning(true)

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, input: stdin }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Execution failed")
      }

      socket?.emit("code:run", {
        roomId,
        output: data.output,
        exitCode: data.exitCode,
        runtime: data.runtime,
      })
    } catch (error) {
      socket?.emit("code:run", {
        roomId,
        output: error instanceof Error ? error.message : "Execution failed",
        exitCode: 1,
        runtime: 0,
      })
    } finally {
      setRunning(false)
    }
  }

  return { running, handleRun }
}
