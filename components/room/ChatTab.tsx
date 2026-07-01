"use client"

import { useEffect, useRef } from "react"
import type { FormEvent } from "react"
import { Button } from "@/components/ui/button"
import type { ChatMessage } from "@/types/room"

type ChatTabProps = {
  chatMessages: ChatMessage[]
  chatInput: string
  onChatInputChange: (value: string) => void
  onSendChat: (event: FormEvent<HTMLFormElement>) => void
}

export default function ChatTab({
  chatMessages,
  chatInput,
  onChatInputChange,
  onSendChat,
}: ChatTabProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {chatMessages.length > 0 ? (
          chatMessages.map((message, index) => (
            <div key={`${message.timestamp}-${index}`} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="font-semibold text-zinc-100">{message.user}</span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-zinc-200">{message.text}</p>
            </div>
          ))
        ) : (
          <p className="text-zinc-500">No chat messages yet. Start the conversation below.</p>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex-shrink-0 border-t border-zinc-800 pt-3">
        <form onSubmit={onSendChat} className="flex gap-2">
          <input
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />
          <Button type="submit" className="h-10 px-4 bg-blue-500 text-white hover:bg-blue-400 focus-visible:ring-blue-400">
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}
