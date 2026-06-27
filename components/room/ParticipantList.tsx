"use client"

import { Button } from "@/components/ui/button"
import type { Participant } from "@/types/room"

type ParticipantListProps = {
  participants: Participant[]
  isHost: boolean
  currentSocketId?: string
  onRoleChange: (targetId: string, newRole: "editor" | "viewer") => void
  onKickParticipant: (targetId: string) => void
}

export default function ParticipantList({
  participants,
  isHost,
  currentSocketId,
  onRoleChange,
  onKickParticipant,
}: ParticipantListProps) {
  return (
    <div className="border-t border-zinc-800 p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Participants</p>
      <div className="space-y-2 text-xs">
        {participants.map((p) => {
          const showHostActions = isHost && p.id !== currentSocketId && p.role !== "host"

          return (
            <div key={p.id} className="flex flex-wrap items-center gap-2">
              <span
                className="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-zinc-100"
                style={{ backgroundColor: p.color }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200 truncate">
                  {p.name}
                  {p.id === currentSocketId && (
                    <span className="ml-1 text-zinc-500">(you)</span>
                  )}
                </p>
                <p className="text-[11px] leading-tight text-emerald-500">
                  online
                </p>
              </div>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                {p.role}
              </span>
              {showHostActions && (
                <div className="flex items-center gap-2">
                  <select
                    value={p.role}
                    onChange={(event) => onRoleChange(p.id, event.target.value as "editor" | "viewer")}
                    className="h-8 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-200 outline-none"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() => onKickParticipant(p.id)}
                  >
                    Kick
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
