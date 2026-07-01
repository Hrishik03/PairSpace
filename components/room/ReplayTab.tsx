"use client"

import type { RefObject } from "react"
import {
  Activity,
  Braces,
  Code2,
  MessageSquareText,
  Play,
  Terminal,
  Users,
  UserMinus,
  UserPlus,
} from "lucide-react"
import { formatTime } from "@/lib/editor-config"
import type { SessionEvent } from "@/types/room"

type ReplayTabProps = {
  elapsedTime: number
  participantsCount: number
  codeRunCount: number
  languageLabel: string
  sessionEvents: SessionEvent[]
  activityEndRef: RefObject<HTMLDivElement | null>
  getRelativeTime: (timestamp: number) => string
}

export default function ReplayTab({
  elapsedTime,
  participantsCount,
  codeRunCount,
  languageLabel,
  sessionEvents,
  activityEndRef,
  getRelativeTime,
}: ReplayTabProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 mb-4 flex flex-wrap gap-2">
        {[
          { icon: Activity, label: formatTime(elapsedTime) },
          { icon: Users, label: participantsCount },
          { icon: Terminal, label: codeRunCount },
          { icon: Braces, label: languageLabel },
        ].map((stat, i) => (
          <div key={i} className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
            <stat.icon className="size-3" />
            {stat.label}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {sessionEvents.length > 0 ? (
          sessionEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-3 text-xs">
              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-zinc-800 border border-zinc-700">
                {event.type === "join" && <UserPlus className="size-3 text-emerald-400" />}
                {event.type === "leave" && <UserMinus className="size-3 text-red-400" />}
                {event.type === "run" && <Play className="size-3 text-blue-400 fill-current" />}
                {event.type === "language_change" && <Code2 className="size-3 text-amber-400" />}
                {event.type === "chat" && <MessageSquareText className="size-3 text-zinc-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-300">
                  <span className="font-semibold" style={{ color: event.color }}>{event.user}</span>
                  {" "}{event.description}
                </p>
                <span className="text-[10px] text-zinc-500">{getRelativeTime(event.timestamp)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-600">
            <Activity className="mb-2 size-8 opacity-20" />
            <p>No activity yet â€” start coding!</p>
          </div>
        )}
        <div ref={activityEndRef} />
      </div>

      <div className="flex-shrink-0 mt-4 pt-4 border-t border-zinc-800" />
    </div>
  )
}
