"use client"

import { useEffect, useState } from "react"
import { Copy, Check, Home, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface SessionEndedModalProps {
  replayId: string | null
  onClose: () => void
}

export default function SessionEndedModal({ replayId, onClose }: SessionEndedModalProps) {
  const [copied, setCopied] = useState(false)
  const [replayUrl, setReplayUrl] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (replayId) {
      setReplayUrl(`${window.location.origin}/replay/${replayId}`)
    }
  }, [replayId])

  const copyReplayUrl = async () => {
    if (!replayUrl) return
    await navigator.clipboard.writeText(replayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGoHome = () => {
    onClose()
    router.push("/")
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
            <ExternalLink className="size-6" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">Session Ended</h2>
          <p className="mt-2 text-sm text-zinc-400">
            The host has ended this collaborative session.
          </p>
        </div>

        {replayId ? (
          <div className="mb-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Replay Link
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs text-blue-400">
                {replayUrl}
              </span>
              <button
                onClick={copyReplayUrl}
                className="flex size-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              You can use this link to watch the session replay at any time.
            </p>
          </div>
        ) : (
          <div className="mb-8 rounded-lg border border-dashed border-zinc-800 p-4 text-center">
            <p className="text-sm text-zinc-500">No replay available for this session.</p>
          </div>
        )}

        <Button
          onClick={handleGoHome}
          className="w-full bg-blue-500 py-6 text-base font-semibold text-white hover:bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-[0.98]"
        >
          <Home className="mr-2 size-5" />
          Back to Home
        </Button>
      </div>
    </div>
  )
}
