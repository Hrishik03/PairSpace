"use client"

import { useEffect, useState } from "react"
import { CODE_TEMPLATE_BY_LANGUAGE } from "@/lib/editor-config"

export function useRoomMetadata(roomId: string) {
  const [language, setLanguage] = useState<string>("typescript")
  const [code, setCode] = useState<string>(CODE_TEMPLATE_BY_LANGUAGE.typescript)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null)
  const [roomError, setRoomError] = useState<Error | null>(null)

  useEffect(() => {
    fetch(`/api/room?roomId=${roomId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setRoomError(new Error(data.error))
          return
        }
        setLanguage(data.language)
        setCode(CODE_TEMPLATE_BY_LANGUAGE[data.language] ?? "")
        localStorage.setItem(`language-${roomId}`, data.language)
        setTimeLeft(
          typeof data.remainingSeconds === "number"
            ? data.remainingSeconds
            : data.durationMinutes * 60
        )
        setMaxParticipants(data.maxParticipants)
      })
      .catch((err) => setRoomError(err))
  }, [roomId])

  return {
    language,
    setLanguage,
    code,
    setCode,
    timeLeft,
    setTimeLeft,
    maxParticipants,
    roomError,
    setRoomError,
  }
}
