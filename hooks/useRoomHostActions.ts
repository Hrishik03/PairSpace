"use client"

import { useEffect, useState } from "react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import type { Socket } from "socket.io-client"
import { getCreatorToken } from "@/lib/creator-token"

type UseRoomHostActionsParams = {
  socket: Socket | null
  roomId: string
  router: AppRouterInstance
  roomLocked: boolean
  setRoomLocked: (locked: boolean) => void
  timerRunning: boolean
}

export function useRoomHostActions({
  socket,
  roomId,
  router,
  roomLocked,
  setRoomLocked,
  timerRunning,
}: UseRoomHostActionsParams) {
  const [canEndSession, setCanEndSession] = useState(false)

  useEffect(() => {
    setCanEndSession(!!getCreatorToken())
  }, [])

  const handleToggleTimer = () => {
    const creatorToken = getCreatorToken()
    if (!creatorToken) return
    if (timerRunning) {
      socket?.emit("timer:pause", { roomId, creatorToken })
    } else {
      socket?.emit("timer:resume", { roomId, creatorToken })
    }
  }

  const handleLockRoom = () => {
    const creatorToken = getCreatorToken()
    if (!creatorToken || !socket) return

    if (roomLocked) {
      socket.emit("room:unlock", { roomId, creatorToken })
      setRoomLocked(false)
    } else {
      socket.emit("room:lock", { roomId, creatorToken })
      setRoomLocked(true)
    }
  }

  const handleKickParticipant = (targetId: string) => {
    const creatorToken = getCreatorToken()
    if (!creatorToken || !socket) return

    if (confirm("Are you sure you want to kick this participant?")) {
      socket.emit("room:kick", { roomId, creatorToken, targetId })
    }
  }

  const handleRoleChange = (targetId: string, newRole: "editor" | "viewer") => {
    const creatorToken = getCreatorToken()
    if (!creatorToken || !socket) return

    socket.emit("role:change", { roomId, creatorToken, targetId, newRole })
  }

  const handleEndSession = () => {
    const creatorToken = getCreatorToken()
    if (!creatorToken || !socket) return

    if (
      confirm(
        "Are you sure you want to end the session? This will kick all participants and close the room."
      )
    ) {
      socket.emit("session:end", { roomId, creatorToken })
    }
  }

  const handleExitRoom = () => {
    if (confirm("Are you sure you want to exit this room?")) {
      socket?.disconnect()
      router.push("/")
    }
  }

  return {
    canEndSession,
    handleToggleTimer,
    handleLockRoom,
    handleKickParticipant,
    handleRoleChange,
    handleEndSession,
    handleExitRoom,
  }
}
