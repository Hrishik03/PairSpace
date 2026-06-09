"use client"

import { useState } from "react"
import { Copy, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ShareModalProps {
  roomId: string
  onClose: () => void
}

export default function ShareModal({ roomId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Share room</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Copy the room ID and share it with participants.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-1.5 text-xs font-medium text-zinc-400">Room ID</p>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
            <span className="flex-1 truncate font-mono text-base text-zinc-100">
              {roomId}
            </span>
            <button
              onClick={copyRoomId}
              className="flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="ml-1 text-[11px]">Copied</span>
                </>
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        </div>

        <Button
          onClick={onClose}
          variant="outline"
          className="w-full border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          Done
        </Button>
      </div>
    </div>
  )
}