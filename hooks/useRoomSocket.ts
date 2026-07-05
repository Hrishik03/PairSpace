"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import type { Socket } from "socket.io-client"
import { CODE_TEMPLATE_BY_LANGUAGE } from "@/lib/editor-config"
import { getCreatorToken } from "@/lib/creator-token"
import { createSessionEvent } from "@/lib/room-events"
import type { ChatMessage, ExecutionResult, Participant, SessionEvent } from "@/types/room"

type UseRoomSocketParams = {
  socket: Socket | null
  roomId: string
  router: AppRouterInstance
  userName: string
  timeLeft: number | null
  maxParticipants: number | null
  setLanguage: (language: string) => void
  setCode: (code: string) => void
  setTimeLeft: (timeLeft: number | null) => void
  setRoomError: (error: Error | null) => void
  appendSessionEvent: (event: SessionEvent) => void
  incrementCodeRunCount: () => void
}

export function useRoomSocket({
  socket,
  roomId,
  router,
  userName,
  timeLeft,
  maxParticipants,
  setLanguage,
  setCode,
  setTimeLeft,
  setRoomError,
  appendSessionEvent,
  incrementCodeRunCount,
}: UseRoomSocketParams) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [notes, setNotes] = useState<string>("")
  const [timerRunning, setTimerRunning] = useState(true)
  const [roomLocked, setRoomLocked] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [replayId, setReplayId] = useState<string | null>(null)
  const prevParticipantsRef = useRef<Participant[]>([])

  const handleLanguageChange = (newLanguage: string) => {
    const currentParticipantRole = participants.find((participant) => participant.id === socket?.id)?.role
    if (currentParticipantRole !== "host") return

    const nextCode = CODE_TEMPLATE_BY_LANGUAGE[newLanguage] ?? ""
    const creatorToken = getCreatorToken() ?? ""

    setLanguage(newLanguage)
    localStorage.setItem(`language-${roomId}`, newLanguage)
    // Don't call setCode here - let the server broadcast handle it for all clients uniformly
    socket?.emit("language:change", {
      roomId,
      language: newLanguage,
      code: nextCode,
      creatorToken,
    })
  }

  const handleSendChat = (
    event: FormEvent<HTMLFormElement>,
    chatInput: string,
    setChatInput: (value: string) => void
  ) => {
    event.preventDefault()
    const trimmed = chatInput.trim()
    if (!trimmed || !socket) return

    socket.emit("chat:message", { roomId, text: trimmed })
    setChatInput("")
  }

  const handleNotesChange = (nextNotes: string) => {
    setNotes(nextNotes)
    socket?.emit("notes:update", { roomId, notes: nextNotes })
  }

  useEffect(() => {
    if (!socket || !roomId || !userName || timeLeft === null) return

    const creatorToken = getCreatorToken()

    socket.emit(
      "room:join",
      {
        roomId,
        name: userName,
        creatorToken: creatorToken ?? undefined,
        role: creatorToken ? "host" : "editor",
        initialRemainingSeconds: timeLeft,
        maxParticipants,
      },
      (response: { error?: string; locked?: boolean; timerRunning?: boolean }) => {
        if (response?.error) {
          setRoomError(new Error(response.error))
          return
        }
        if (response?.locked) {
          setRoomLocked(true)
        }
        if (typeof response?.timerRunning === "boolean") {
          setTimerRunning(response.timerRunning)
        }
      }
    )

    socket.on("participants:update", (data: Participant[]) => {
      const prev = prevParticipantsRef.current
      const newJoins = data.filter((p) => !prev.find((pp) => pp.id === p.id))
      const newLeaves = prev.filter((p) => !data.find((pp) => pp.id === p.id))

      newJoins.forEach((p) => {
        appendSessionEvent(
          createSessionEvent("join", p.name, p.color, "joined the room")
        )
      })
      newLeaves.forEach((p) => {
        appendSessionEvent(
          createSessionEvent("leave", p.name, p.color, "left the room")
        )
      })

      prevParticipantsRef.current = data
      setParticipants(data)
    })

    socket.on("code:output", (data: ExecutionResult & { user?: string; color?: string }) => {
      setResult({ ...data, timestamp: Date.now() })
      incrementCodeRunCount()
      appendSessionEvent(
        createSessionEvent(
          "run",
          data.user || "System",
          data.color || "#5b7fff",
          "executed code"
        )
      )
    })

    socket.on("chat:new", (message: ChatMessage) => {
      setChatMessages((current) => [...current, message])
      appendSessionEvent(
        createSessionEvent(
          "chat",
          message.user,
          message.color,
          `sent a message: ${message.text}`
        )
      )
    })

    socket.on("language:changed", ({ language: lang, code }: { language: string; code: string }) => {
      setLanguage(lang)
      setCode(code)
      localStorage.setItem(`language-${roomId}`, lang)
      appendSessionEvent(
        createSessionEvent(
          "language_change",
          "System",
          "#5b7fff",
          `switched language to ${lang}`
        )
      )
    })

    socket.on("notes:changed", ({ notes: nextNotes }: { notes: string }) => {
      setNotes(nextNotes)
    })

    socket.on("timer:paused", () => setTimerRunning(false))
    socket.on("timer:resumed", () => setTimerRunning(true))
    socket.on("timer:tick", ({ remainingSeconds }: { remainingSeconds: number }) => {
      setTimeLeft(remainingSeconds)
    })
    socket.on("timer:ended", () => {
      setTimeLeft(0)
      setTimerRunning(false)
    })
    socket.on("room:locked", (locked: boolean) => setRoomLocked(locked))
    socket.on("room:kicked", () => {
      socket.disconnect()
      router.push("/")
    })
    socket.on("session:ended", ({ replayId: id }: { replayId: string }) => {
      setSessionEnded(true)
      setReplayId(id)
    })

    return () => {
      socket.off("participants:update")
      socket.off("language:changed")
      socket.off("code:output")
      socket.off("chat:new")
      socket.off("notes:changed")
      socket.off("timer:paused")
      socket.off("timer:resumed")
      socket.off("timer:tick")
      socket.off("timer:ended")
      socket.off("room:locked")
      socket.off("room:kicked")
      socket.off("session:ended")
    }
  }, [
    socket,
    roomId,
    router,
    userName,
    timeLeft === null,
    maxParticipants,
    appendSessionEvent,
    incrementCodeRunCount,
  ])

  const currentParticipant = socket
    ? participants.find((participant) => participant.id === socket.id)
    : undefined
  const currentParticipantId = currentParticipant?.id
  const currentParticipantRole = currentParticipant?.role

  useEffect(() => {
    if (!socket) return

    if (!currentParticipantId || currentParticipantRole === "host") return

    const updateStatus = () => {
      socket.emit("participant:status", {
        roomId,
        status: document.hidden ? "away" : "online",
      })
    }

    updateStatus()
    document.addEventListener("visibilitychange", updateStatus)

    return () => {
      document.removeEventListener("visibilitychange", updateStatus)
    }
  }, [socket, roomId, currentParticipantId, currentParticipantRole])

  return {
    participants,
    result,
    chatMessages,
    notes,
    timerRunning,
    roomLocked,
    setRoomLocked,
    sessionEnded,
    setSessionEnded,
    replayId,
    handleLanguageChange,
    handleSendChat,
    handleNotesChange,
  }
}
