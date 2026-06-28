"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getRelativeTime } from "@/lib/time"
import type { SessionEvent } from "@/types/room"

export function useSessionActivity(activeTab: "output" | "chat" | "replay") {
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([])
  const [codeRunCount, setCodeRunCount] = useState(0)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const activityEndRef = useRef<HTMLDivElement>(null)

  const appendSessionEvent = useCallback((event: SessionEvent) => {
    setSessionEvents((prev) => [event, ...prev])
  }, [])

  const incrementCodeRunCount = useCallback(() => {
    setCodeRunCount((prev) => prev + 1)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  useEffect(() => {
    if (activeTab === "replay") {
      activityEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [sessionEvents, activeTab])

  return {
    sessionEvents,
    codeRunCount,
    elapsedTime,
    activityEndRef,
    appendSessionEvent,
    incrementCodeRunCount,
    getRelativeTime,
  }
}
