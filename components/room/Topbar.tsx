"use client"

import { Clock3, Code2, Copy, PauseCircle, Play, PlayCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  LANGUAGE_LABELS,
  LANGUAGE_VALUE_BY_LABEL,
  formatTime,
} from "@/lib/editor-config"
import type { Participant } from "@/types/room"

type TopbarProps = {
  roomId: string
  language: string
  isReadOnly: boolean
  running: boolean
  timeLeft: number | null
  timerRunning: boolean
  roomLocked: boolean
  myParticipant?: Participant
  isHost: boolean
  canEndSession: boolean
  onLanguageChange: (language: string) => void
  onRun: () => void
  onToggleTimer: () => void
  onLockRoom: () => void
  onEndSession: () => void
  onExitRoom: () => void
  onOpenShare: () => void
  onOpenSettings: () => void
}

export default function Topbar({
  roomId,
  language,
  isReadOnly,
  running,
  timeLeft,
  timerRunning,
  roomLocked,
  myParticipant,
  isHost,
  canEndSession,
  onLanguageChange,
  onRun,
  onToggleTimer,
  onLockRoom,
  onEndSession,
  onExitRoom,
  onOpenShare,
  onOpenSettings,
}: TopbarProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto flex w-full max-w-425 flex-wrap items-center gap-2 px-3 py-2 md:px-5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <Code2 className="size-4 text-blue-400" />
          PairSpace
        </span>
        <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
          {roomId}
        </span>
        <div className="mx-auto hidden items-center gap-2 lg:flex">
          <select
            value={language}
            disabled={myParticipant?.role !== "host"}
            title={myParticipant?.role !== "host" ? "Only the host can change the language" : undefined}
            onChange={(event) => {
              if (myParticipant?.role === "host") {
                onLanguageChange(event.target.value)
              }
            }}
            className={`h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-300 outline-none ${
              myParticipant?.role !== "host"
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }`}
          >
            {LANGUAGE_LABELS.map((lang) => (
              <option key={lang} value={LANGUAGE_VALUE_BY_LABEL[lang]}>
                {lang}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={onRun}
            disabled={running || isReadOnly}
            className="h-8 cursor-pointer bg-emerald-400 text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            <Play className="size-3.5" />
            {running ? "Running..." : "Run"}
          </Button>
          {/* Timer + controls */}
          <div className="flex items-center gap-1">
            <span className={`inline-flex h-8 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs ${
              timeLeft !== null && timeLeft <= 300 ? "text-red-400" : "text-amber-300"
            }`}>
              <Clock3 className="size-3.5" />
              {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
            </span>

            {myParticipant?.role === "host" && (
              <button
                onClick={onToggleTimer}
                title={timerRunning ? "Pause timer" : "Resume timer"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              >
                {timerRunning ? (
                  <PauseCircle className="size-5.5 cursor-pointer" />
                ) : (
                  <PlayCircle className="size-5.5 cursor-pointer" />
                )}
              </button>
            )}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
           {myParticipant?.role ?? "connecting..."}
          </span>
          {isHost && (
            <Button
              size="sm"
              variant="outline"
              onClick={onLockRoom}
              className="cursor-pointer h-8 border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
            >
              {roomLocked ? "Unlock room" : "Lock room"}
            </Button>
          )}
          {isHost && canEndSession && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onEndSession}
              className="cursor-pointer h-8 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              End session
            </Button>
          )}
          {!isHost && (myParticipant?.role === "editor" || myParticipant?.role === "viewer") && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onExitRoom}
              className="cursor-pointer h-8 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              Exit
            </Button>
          )}
          <Button size="sm"
           variant="outline"
           onClick={onOpenShare}
           className="h-8 cursor-pointer border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
           >
            <Copy className="size-3.5" />
            Share
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onOpenSettings}
            className="h-8 cursor-pointer border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
          >
            <Settings className="size-3.5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
