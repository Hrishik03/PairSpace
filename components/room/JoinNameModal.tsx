"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FormEvent } from "react"

type JoinNameModalProps = {
  joinName: string
  joinError: string
  joinLoading: boolean
  onJoinNameChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function JoinNameModal({
  joinName,
  joinError,
  joinLoading,
  onJoinNameChange,
  onSubmit,
}: JoinNameModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-100">Enter your display name</h2>
        <p className="mt-2 text-sm text-zinc-400">
          This name will appear for other participants in the room.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm text-zinc-300">
            <span className="sr-only">Display name</span>
            <input
              value={joinName}
              onChange={(event) => onJoinNameChange(event.target.value)}
              placeholder="Your display name"
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            />
          </label>
          {joinError && <p className="text-sm text-red-400">{joinError}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={joinLoading} className="h-10">
              {joinLoading ? <Loader2 className="size-4 animate-spin" /> : "Join room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
