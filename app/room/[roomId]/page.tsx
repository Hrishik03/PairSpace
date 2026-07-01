"use client"

import { use, useState, type FormEvent } from "react"
import type { editor } from "monaco-editor"
import { useRouter } from "next/navigation"
import EditorPanel from "@/components/room/EditorPanel"
import JoinNameModal from "@/components/room/JoinNameModal"
import RightPanel from "@/components/room/RightPanel"
import ShareModal from "@/components/room/ShareModal"
import SettingsModal from "@/components/room/SettingsModal"
import SessionEndedModal from "@/components/room/SessionEndedModal"
import Topbar from "@/components/room/Topbar"
import { useCodeExecution } from "@/hooks/useCodeExecution"
import { useEditorSettings } from "@/hooks/useEditorSettings"
import { useJoinPrompt } from "@/hooks/useJoinPrompt"
import { useRoomHostActions } from "@/hooks/useRoomHostActions"
import { useRoomMetadata } from "@/hooks/useRoomMetadata"
import { useRoomSocket } from "@/hooks/useRoomSocket"
import { useSessionActivity } from "@/hooks/useSessionActivity"
import { useSocket } from "@/hooks/useSockets"
import { useYjs } from "@/hooks/useYjs"
import { LANGUAGE_LABELS, LANGUAGE_VALUE_BY_LABEL } from "@/lib/editor-config"

type RoomPageProps = {
  params: Promise<{ roomId: string }>
}

export function RoomPageInner({ params }: RoomPageProps) {
  const { roomId } = use(params)
  const router = useRouter()
  const socket = useSocket()

  const metadata = useRoomMetadata(roomId)
  const join = useJoinPrompt()
  const { editorSettings, updateSettings } = useEditorSettings()

  const [stdin, setStdin] = useState("")
  const [activeTab, setActiveTab] = useState<"output" | "chat" | "replay">("output")
  const [chatInput, setChatInput] = useState("")
  const [activeEditorTab, setActiveEditorTab] = useState<"solution" | "notes">("solution")
  const [shareOpen, setShareOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const activity = useSessionActivity(activeTab)

  const room = useRoomSocket({
    socket,
    roomId,
    router,
    userName: join.userName,
    timeLeft: metadata.timeLeft,
    maxParticipants: metadata.maxParticipants,
    setLanguage: metadata.setLanguage,
    setCode: metadata.setCode,
    setTimeLeft: metadata.setTimeLeft,
    setRoomError: metadata.setRoomError,
    appendSessionEvent: activity.appendSessionEvent,
    incrementCodeRunCount: activity.incrementCodeRunCount,
  })

  const execution = useCodeExecution({
    socket,
    roomId,
    code: metadata.code,
    language: metadata.language,
    stdin,
  })

  const host = useRoomHostActions({
    socket,
    roomId,
    router,
    roomLocked: room.roomLocked,
    setRoomLocked: room.setRoomLocked,
    timerRunning: room.timerRunning,
  })

  const myParticipant = room.participants.find((p) => p.id === socket?.id)
  const isHost = myParticipant?.role === "host"
  const isReadOnly = myParticipant?.role === "viewer"
  const languageLabel =
    LANGUAGE_LABELS.find((label) => LANGUAGE_VALUE_BY_LABEL[label] === metadata.language) ??
    metadata.language
  const userNameForYjs = join.userName

  const { bindEditor, isSynced } = useYjs({
    roomId,
    language: metadata.language,
    userName: userNameForYjs,
    userColor: myParticipant?.color ?? "#5b7fff",
  })

  const handleEditorMount = (monacoEditor: editor.IStandaloneCodeEditor) => {
    bindEditor(monacoEditor)
  }

  const handleSendChat = (event: FormEvent<HTMLFormElement>) => {
    room.handleSendChat(event, chatInput, setChatInput)
  }

  if (metadata.roomError) throw metadata.roomError

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Topbar
        roomId={roomId}
        language={metadata.language}
        isReadOnly={isReadOnly}
        running={execution.running}
        timeLeft={metadata.timeLeft}
        timerRunning={room.timerRunning}
        roomLocked={room.roomLocked}
        myParticipant={myParticipant}
        isHost={isHost}
        canEndSession={host.canEndSession}
        onLanguageChange={room.handleLanguageChange}
        onRun={execution.handleRun}
        onToggleTimer={host.handleToggleTimer}
        onLockRoom={host.handleLockRoom}
        onEndSession={host.handleEndSession}
        onExitRoom={host.handleExitRoom}
        onOpenShare={() => setShareOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {join.joinPromptOpen && (
        <JoinNameModal
          joinName={join.joinName}
          joinError={join.joinError}
          joinLoading={join.joinLoading}
          onJoinNameChange={join.handleJoinNameChange}
          onSubmit={join.handleJoinSubmit}
        />
      )}

      <section className="mx-auto grid w-full max-w-425 flex-1 gap-3 p-3 md:grid-cols-[1fr_340px]">
        <EditorPanel
          language={metadata.language}
          activeEditorTab={activeEditorTab}
          code={metadata.code}
          notes={room.notes}
          editorSettings={editorSettings}
          isReadOnly={isReadOnly}
          running={execution.running}
          timeLeft={metadata.timeLeft}
          timerRunning={room.timerRunning}
          isHost={isHost}
          isSynced={isSynced}
          onActiveEditorTabChange={setActiveEditorTab}
          onLanguageChange={room.handleLanguageChange}
          onRun={execution.handleRun}
          onToggleTimer={host.handleToggleTimer}
          onCodeChange={metadata.setCode}
          onNotesChange={room.handleNotesChange}
          onEditorMount={handleEditorMount}
        />

        <RightPanel
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          result={room.result}
          running={execution.running}
          stdin={stdin}
          onStdinChange={setStdin}
          chatMessages={room.chatMessages}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSendChat={handleSendChat}
          elapsedTime={activity.elapsedTime}
          participants={room.participants}
          codeRunCount={activity.codeRunCount}
          languageLabel={languageLabel}
          sessionEvents={activity.sessionEvents}
          activityEndRef={activity.activityEndRef}
          getRelativeTime={activity.getRelativeTime}
          isHost={isHost}
          currentSocketId={socket?.id}
          onRoleChange={host.handleRoleChange}
          onKickParticipant={host.handleKickParticipant}
        />
      </section>

      {shareOpen && <ShareModal roomId={roomId} onClose={() => setShareOpen(false)} />}
      {settingsOpen && (
        <SettingsModal
          settings={editorSettings}
          onUpdate={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {room.sessionEnded && (
        <SessionEndedModal
          replayId={room.replayId}
          onClose={() => room.setSessionEnded(false)}
        />
      )}
    </main>
  )
}

export default function RoomPage({ params }: RoomPageProps) {
  return <RoomPageInner params={params} />
}
