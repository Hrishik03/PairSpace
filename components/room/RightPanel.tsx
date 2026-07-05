"use client"

import type { FormEvent, RefObject } from "react"
import OutputTab from "@/components/room/OutputTab"
import ChatTab from "@/components/room/ChatTab"
import ReplayTab from "@/components/room/ReplayTab"
import ParticipantList from "@/components/room/ParticipantList"
import type { ChatMessage, ExecutionResult, Participant, SessionEvent } from "@/types/room"

type RightPanelProps = {
  activeTab: "output" | "chat" | "replay"
  onActiveTabChange: (tab: "output" | "chat" | "replay") => void
  result: ExecutionResult | null
  running: boolean
  stdin: string
  onStdinChange: (value: string) => void
  chatMessages: ChatMessage[]
  chatInput: string
  onChatInputChange: (value: string) => void
  onSendChat: (event: FormEvent<HTMLFormElement>) => void
  elapsedTime: number
  participants: Participant[]
  codeRunCount: number
  languageLabel: string
  sessionEvents: SessionEvent[]
  activityEndRef: RefObject<HTMLDivElement | null>
  getRelativeTime: (timestamp: number) => string
  isHost: boolean
  currentSocketId?: string
  onRoleChange: (targetId: string, newRole: "editor" | "viewer") => void
  onKickParticipant: (targetId: string) => void
  unseenChatCount?: number
}

export default function RightPanel({
  activeTab,
  onActiveTabChange,
  result,
  running,
  stdin,
  onStdinChange,
  chatMessages,
  chatInput,
  onChatInputChange,
  onSendChat,
  elapsedTime,
  participants,
  codeRunCount,
  languageLabel,
  sessionEvents,
  activityEndRef,
  getRelativeTime,
  isHost,
  currentSocketId,
  onRoleChange,
  onKickParticipant,
  unseenChatCount = 0,
}: RightPanelProps) {
  return (
    <aside className="flex h-[calc(100vh-80px)] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="grid grid-cols-3 border-b border-zinc-800 text-center text-xs">
        <button
          type="button"
          className={`flex cursor-pointer items-center justify-center px-2 py-2 ${activeTab === "output" ? "border-b-2 border-blue-400 text-blue-300" : "text-zinc-500"}`}
          onClick={() => onActiveTabChange("output")}
        >
          Output
        </button>
        <button
          type="button"
          className={`flex cursor-pointer items-center justify-center gap-1 px-2 py-2 ${activeTab === "chat" ? "border-b-2 border-blue-400 text-blue-300" : "text-zinc-500"}`}
          onClick={() => onActiveTabChange("chat")}
        >
          Chat
          {unseenChatCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
              {unseenChatCount > 99 ? "99+" : unseenChatCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`flex cursor-pointer items-center justify-center px-2 py-2 ${activeTab === "replay" ? "border-b-2 border-blue-400 text-blue-300" : "text-zinc-500"}`}
          onClick={() => onActiveTabChange("replay")}
        >
          Replay
        </button>
      </div>

      <div className="flex-1 overflow-hidden p-3">
        {activeTab === "output" ? (
          <OutputTab
            result={result}
            running={running}
            stdin={stdin}
            onStdinChange={onStdinChange}
          />
        ) : activeTab === "chat" ? (
          <ChatTab
            chatMessages={chatMessages}
            chatInput={chatInput}
            onChatInputChange={onChatInputChange}
            onSendChat={onSendChat}
          />
        ) : (
          <ReplayTab
            elapsedTime={elapsedTime}
            participantsCount={participants.length}
            codeRunCount={codeRunCount}
            languageLabel={languageLabel}
            sessionEvents={sessionEvents}
            activityEndRef={activityEndRef}
            getRelativeTime={getRelativeTime}
          />
        )}
      </div>

      <ParticipantList
        participants={participants}
        isHost={isHost}
        currentSocketId={currentSocketId}
        onRoleChange={onRoleChange}
        onKickParticipant={onKickParticipant}
      />
    </aside>
  )
}
