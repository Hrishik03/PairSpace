"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Code2 } from "lucide-react"
import Link from "next/link"

type SessionEvent =
  | {
      t: number
      type: "run"
      user: string
      payload: {
        output: string
        exitCode: number
        runtime: string
      }
    }
  | {
      t: number
      type: "join" | "leave"
      user: string
      payload: Record<string, unknown>
    }
  | {
      t: number
      type: "language_change"
      user: string
      payload: {
        language: string
      }
    }
  | {
      t: number
      type: "chat"
      user: string
      payload: {
        message: string
      }
    }

interface ReplayData {
  id: string
  createdAt: string
  durationS: number
  log: SessionEvent[]
}

export default function ReplayPage() {
  const { id } = useParams()
  const [replay, setReplay] = useState<ReplayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)

  const [replayError, setReplayError] = useState<Error | null>(null)
  const replayLink = typeof window !== "undefined" ? window.location.href : ""

  useEffect(() => {
    fetch(`/api/replay/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Replay not found")
        return res.json()
      })
      .then(data => {
        setReplay(data)
        setLoading(false)
      })
      .catch(err => setReplayError(err))
  }, [id])

  if (replayError) throw replayError

  useEffect(() => {
    if (!playing || !replay) return
    const interval = setInterval(() => {
      setCurrentTime(t => {
        if (t >= replay.durationS) {
          setPlaying(false)
          return replay.durationS
        }
        return t + 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [playing, replay])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

  if (loading) return null
  if (!replay) {
    throw new Error("Replay not found")
  }

  const replayData = replay
  const visibleEvents = replayData.log.filter(e => e.t <= currentTime)

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-3 flex items-center gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
          <Code2 className="size-4 text-blue-400" />
          PairSpace
        </Link>
        <span className="text-zinc-500">·</span>
        <span className="text-xs text-zinc-400">Session Replay</span>
        <span className="ml-auto text-xs text-zinc-500">
          {new Date(replayData.createdAt).toLocaleDateString()}
        </span>
      </header>

      <div className="mx-auto max-w-4xl p-6">
        {/* Scrubber */}
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={() => setPlaying(p => !p)}
              className="flex size-9 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600"
            >
              {playing ? "⏸" : "▶"}
            </button>
            <span className="font-mono text-sm text-zinc-300">
              {formatTime(currentTime)}
              <span className="text-zinc-500"> / {formatTime(replayData.durationS)}</span>
            </span>
            <button
              onClick={() => { setCurrentTime(0); setPlaying(false) }}
              className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
            >
              Reset
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={replayData.durationS}
            value={currentTime}
            onChange={e => {
              setCurrentTime(Number(e.target.value))
              setPlaying(false)
            }}
            className="w-full accent-blue-500"
          />
          {/* Event markers */}
          <div className="relative mt-2 h-2">
            {replayData.log.map((event, i) => (
              <div
                key={i}
                onClick={() => setCurrentTime(event.t)}
                title={`${event.type} by ${event.user}`}
                style={{ left: `${(event.t / replayData.durationS) * 100}%` }}
                className={`absolute top-0 h-2 w-1 cursor-pointer rounded-full ${
                  event.type === "run" ? "bg-emerald-400" :
                  event.type === "join" ? "bg-blue-400" :
                  event.type === "leave" ? "bg-red-400" :
                  event.type === "chat" ? "bg-violet-400" :
                  "bg-yellow-400"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Event timeline */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Event Timeline
          </div>
          <div className="divide-y divide-zinc-800">
            {visibleEvents.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-zinc-500">
                Hit play to start the replay
              </div>
            ) : (
              [...visibleEvents].reverse().map((event, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 flex size-6 flex-shrink-0 items-center justify-center rounded-md text-xs ${
                    event.type === "run" ? "bg-emerald-500/15 text-emerald-400" :
                    event.type === "join" ? "bg-blue-500/15 text-blue-400" :
                    event.type === "leave" ? "bg-red-500/15 text-red-400" :
                    event.type === "chat" ? "bg-violet-500/15 text-violet-400" :
                    "bg-zinc-700 text-zinc-400"
                  }`}>
                    {event.type === "run" ? "▶" :
                     event.type === "join" ? "→" :
                     event.type === "leave" ? "←" :
                     event.type === "chat" ? "✦" : "·"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">
                      <span className="font-medium text-blue-300">{event.user}</span>
                      {" "}
                      {event.type === "run" ? "ran code" :
                       event.type === "join" ? "joined the room" :
                       event.type === "leave" ? "left the room" :
                       event.type === "language_change" ? `switched to ${String(event.payload.language)}` :
                       event.type === "chat" ? `said: ${String(event.payload.message)}` :
                       event.type}
                    </p>
                    {event.type === "run" && event.payload.output && (
                      <p className={`mt-1 font-mono text-xs ${
                        event.payload.exitCode === 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {String(event.payload.output).slice(0, 100)}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 font-mono text-xs text-zinc-500">
                    {formatTime(event.t)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Share */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <span className="text-xs text-zinc-400">Replay link:</span>
          <span className="flex-1 font-mono text-xs text-blue-400">
            {replayLink}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(replayLink)}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
          >
            Copy
          </button>
        </div>
      </div>
    </main>
  )
}
