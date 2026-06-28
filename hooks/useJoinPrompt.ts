"use client"

import { useEffect, useState, type FormEvent } from "react"

export function useJoinPrompt() {
  const [userName, setUserName] = useState("")
  const [joinName, setJoinName] = useState("")
  const [joinPromptOpen, setJoinPromptOpen] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("userName") ?? ""
    setUserName(saved)
    setJoinPromptOpen(!saved)
  }, [])

  const handleJoinNameChange = (value: string) => {
    setJoinName(value)
    if (joinError) setJoinError("")
  }

  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = joinName.trim()
    if (!trimmed) {
      setJoinError("Enter a display name.")
      return
    }

    setJoinLoading(true)
    localStorage.setItem("userName", trimmed)
    setUserName(trimmed)
    setJoinPromptOpen(false)
    setJoinLoading(false)
  }

  return {
    userName,
    joinName,
    joinPromptOpen,
    joinLoading,
    joinError,
    handleJoinNameChange,
    handleJoinSubmit,
  }
}
