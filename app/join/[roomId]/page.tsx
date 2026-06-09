"use client"

import { useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Code2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function JoinPage() {
  const { roomId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get("role") ?? "editor"

  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleJoin = async () => {
    if (!name.trim()) return
    setLoading(true)

    // verify room exists
    const res = await fetch(`/api/room?roomId=${roomId}`)
    const data = await res.json()

    if (data.error) {
      setError("This room doesn't exist or has expired.")
      setLoading(false)
      return
    }

    localStorage.setItem("userName", name.trim())
    localStorage.removeItem("creatorToken")
    router.push(`/room/${roomId}?role=${role}`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">

        {/* Logo */}
        <div className="mb-6 flex items-center gap-2">
          <Code2 className="size-4 text-blue-400" />
          <span className="text-sm font-semibold">PairSpace</span>
        </div>

        {/* Header */}
        <h1 className="mb-1 text-xl font-semibold text-zinc-100">
          You've been invited
        </h1>
        <p className="mb-6 text-sm text-zinc-400">
          Joining as{" "}
          <span className={`font-medium ${
            role === "viewer" ? "text-violet-400" : "text-blue-400"
          }`}>
            {role}
          </span>
          {" "}to room{" "}
          <span className="font-mono text-zinc-300">{roomId}</span>
        </p>

        {/* Name input */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Your name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
            placeholder="e.g. alex"
            autoFocus
            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {/* Role info */}
        <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-500">
          {role === "viewer"
            ? "You'll be able to watch the session and chat, but not edit code."
            : "You'll be able to edit code, run it, and chat with others."
          }
        </div>

        <Button
          onClick={handleJoin}
          disabled={!name.trim() || loading}
          className="w-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join room"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </main>
  )
}