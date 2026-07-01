"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowRight,
  Clock3,
  Code2,
  Loader2,
  MessageSquareText,
} from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [maxParticipants, setMaxParticipants] = useState("5")
  const [roomDuration, setRoomDuration] = useState("60")
  const [roomName, setRoomName] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("typescript")

  const handleCreateRoom = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName || undefined,
          maxParticipants: Number(maxParticipants),
          durationMinutes: Number(roomDuration),
          language: selectedLanguage,
        }),
      })

      if (!res.ok) {
        console.error("Failed to create room:", res.status, await res.text())
        alert("Failed to create room. Try restarting the dev server (stop npm run dev, delete .next, then run npm run dev again).")
        return
      }

      const { roomId, creatorToken } = await res.json()
      localStorage.setItem("creatorToken", creatorToken)
      localStorage.setItem("userName", name.trim())
      setDialogOpen(false)
      router.push(`/room/${roomId}`)
    } catch (error) {
      console.error("Failed to create room:", error)
      alert("Failed to create room. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = () => {
    if (!name.trim() || !roomCode.trim()) return
    localStorage.setItem("userName", name.trim())
    router.push(`/room/${roomCode.trim()}`)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.2),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(168,85,247,0.16),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[36px_36px] opacity-20" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-12 md:px-10">
        <header className="mb-10">
          <div className="relative inline-flex items-center justify-center">
            <span className="pointer-events-none absolute -inset-x-10 -inset-y-4 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.28),transparent_65%)] blur-xl" />
            <h2 className="font-heading relative text-4xl font-semibold tracking-tight md:text-5xl">
              <span className="bg-linear-to-r from-zinc-100 via-blue-300 to-violet-300 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(96,165,250,0.3)]">
                PairSpace
              </span>
            </h2>
          </div>
        </header>

        <div className="w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-[0_0_80px_rgba(59,130,246,0.12)] backdrop-blur md:p-12">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-50 md:text-5xl md:leading-[1.05]">
            Code together,
            <span className="bg-linear-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              {" "}instantly.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
            Share a room URL and jump into a collaborative coding space in
            seconds. Built for interviews, pair sessions, and mentorship with
            editor, chat, notes, and replay in one place.
          </p>

          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                placeholder="Your name"
              />
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="h-11 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                placeholder="Room code"
              />
              <Button
                onClick={handleJoinRoom}
                disabled={!name.trim() || !roomCode.trim()}
                className="h-11 min-w-36 cursor-pointer bg-blue-500 text-zinc-950 hover:bg-blue-600 hover:text-white disabled:opacity-50"
              >
                Join room
                <ArrowRight className="size-4" />
              </Button>
            </div>
            <div className="my-3 flex items-center gap-3 text-xs text-zinc-500">
              <span className="h-px flex-1 bg-zinc-800" />
              or
              <span className="h-px flex-1 bg-zinc-800" />
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={loading}
              variant="outline"
              className="h-11 w-full cursor-pointer border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Create a fresh room"}
            </Button>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
            <Code2 className="mb-3 size-5 text-blue-400" />
            <h2 className="font-heading text-sm font-semibold text-zinc-100">Live editor sync</h2>
            <p className="mt-2 text-sm text-zinc-400">
              CRDT-driven collaboration with shared cursors and stable conflict resolution.
            </p>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
            <MessageSquareText className="mb-3 size-5 text-violet-400" />
            <h2 className="font-heading text-sm font-semibold text-zinc-100">Contextual collaboration</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Inline comments, side chat, and shared notes to keep discussion close to the code.
            </p>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
            <Clock3 className="mb-3 size-5 text-emerald-400" />
            <h2 className="font-heading text-sm font-semibold text-zinc-100">Session lifecycle</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Ephemeral rooms with replay links after expiry for post-session review.
            </p>
          </article>
        </section>

        <section className="mt-8 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} PairSpace. Built for collaborative interviews and pair programming.
        </section>
      </section>
      {dialogOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Create a room</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Configure your session before inviting others.
        </p>
      </div>

      <div className="mb-4">
     <label className="mb-1.5 block text-xs font-medium text-zinc-400">
       Your name <span className="text-red-500">*</span>
     </label>
     <input
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="e.g. alex"
    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
    />
    </div>

      {/* Room name */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          Room name <span className="text-zinc-600">(optional)</span>
        </label>
        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="e.g. frontend interview round 1"
          className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Max participants */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          Max participants
        </label>
        <div className="grid grid-cols-4 gap-2">
          {["2", "3", "5", "10"].map((val) => (
            <button
              key={val}
              onClick={() => setMaxParticipants(val)}
              className={`cursor-pointer rounded-lg border py-2 text-sm font-medium transition-colors ${
                maxParticipants === val
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Room duration */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          Room duration
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "30m", value: "30" },
            { label: "1h", value: "60" },
            { label: "1.5h", value: "90" },
            { label: "2h", value: "120" },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRoomDuration(value)}
              className={`cursor-pointer rounded-lg border py-2 text-sm font-medium transition-colors ${
                roomDuration === value
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Default language */}
      <div className="mb-6">
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          Starting language
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="go">Go</option>
          <option value="javascript">JavaScript</option>
        </select>
      </div>

      {/* Summary */}
      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-500">
        Room will hold up to <span className="text-zinc-300">{maxParticipants} participants</span> and
        expire after <span className="text-zinc-300">{roomDuration} minutes</span> of inactivity.
        No signup required to join.
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => setDialogOpen(false)}
          variant="outline"
          className="flex-1 cursor-pointer border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateRoom}
          disabled={loading || !name.trim()}
          className="flex-1 cursor-pointer bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Create room →"}
        </Button>
      </div>
    </div>
  </div>
)}
    </main>
  )
}