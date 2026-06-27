"use client";

import { use, useEffect, useRef, useState, type FormEvent } from "react";
import type { editor } from "monaco-editor"
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import EditorPanel from "@/components/room/EditorPanel"
import RightPanel from "@/components/room/RightPanel"
import ShareModal from "@/components/room/ShareModal"
import SettingsModal, { EditorSettings } from "@/components/room/SettingsModal"
import SessionEndedModal from "@/components/room/SessionEndedModal"
import Topbar from "@/components/room/Topbar"
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSockets"
import { useYjs } from "@/hooks/useYjs"
import {
  CODE_TEMPLATE_BY_LANGUAGE,
  LANGUAGE_LABELS,
  LANGUAGE_VALUE_BY_LABEL,
} from "@/lib/editor-config"
import type { ChatMessage, ExecutionResult, Participant, SessionEvent } from "@/types/room"

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
};

export function RoomPageInner({ params }: RoomPageProps) {
  const { roomId } = use(params);
  const router = useRouter();
  const socket = useSocket()
  const [language, setLanguage] = useState<string>("typescript")
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("userName") ?? ""
  })
  const [joinName, setJoinName] = useState<string>("")
  const [joinPromptOpen, setJoinPromptOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    return !Boolean(localStorage.getItem("userName"))
  })
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState("")
  const [code, setCode] = useState<string>(CODE_TEMPLATE_BY_LANGUAGE.typescript);
  const [participants, setParticipants] = useState<Participant[]>([])
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [running, setRunning] = useState(false)
  const [stdin, setStdin] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"output" | "chat" | "replay">("output")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState<string>("")
  const [activeEditorTab, setActiveEditorTab] = useState<"solution" | "notes">("solution")
  const [notes, setNotes] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [timerRunning, setTimerRunning] = useState(true)
  const [roomLocked, setRoomLocked] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    if (typeof window === "undefined") return { theme: "vs-dark", fontSize: 14, wordWrap: "on", keybindings: "standard" }
    const saved = localStorage.getItem("editorSettings")
    return saved ? JSON.parse(saved) : { theme: "vs-dark", fontSize: 14, wordWrap: "on", keybindings: "standard" }
  })
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([])
  const [sessionEnded, setSessionEnded] = useState(false)
  const [replayId, setReplayId] = useState<string | null>(null)
  const [startTime] = useState(Date.now())
  const [codeRunCount, setCodeRunCount] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [roomError, setRoomError] = useState<Error | null>(null)
  const prevParticipantsRef = useRef<Participant[]>([])
  const activityEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  useEffect(() => {
    if (activeTab === "replay") {
      activityEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [sessionEvents, activeTab])

  const updateSettings = (newSettings: EditorSettings) => {
    setEditorSettings(newSettings)
    localStorage.setItem("editorSettings", JSON.stringify(newSettings))
  }

  useEffect(() => {
    fetch(`/api/room?roomId=${roomId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setRoomError(new Error(data.error))
          return
        }
        setLanguage(data.language)
        setCode(CODE_TEMPLATE_BY_LANGUAGE[data.language] ?? "")
        localStorage.setItem(`language-${roomId}`, data.language)
        setTimeLeft(typeof data.remainingSeconds === "number" ? data.remainingSeconds : data.durationMinutes * 60)
        ;(window as any)._maxParticipants = data.maxParticipants
      })
      .catch(err => setRoomError(err))
  }, [roomId])

  if (roomError) throw roomError

  const handleLanguageChange = (newLanguage: string) => {
    const nextCode = CODE_TEMPLATE_BY_LANGUAGE[newLanguage] ?? ""
    setLanguage(newLanguage)
    localStorage.setItem(`language-${roomId}`, newLanguage)
    setCode(nextCode)
    socket?.emit("language:change", { roomId, language: newLanguage, code: nextCode })
  };

  const handleToggleTimer = () => {
    const creatorToken = localStorage.getItem("creatorToken")
    if (!creatorToken) return
    if (timerRunning) {
      socket?.emit("timer:pause", { roomId, creatorToken })
    } else {
      socket?.emit("timer:resume", { roomId, creatorToken })
    }
  }

  const handleRun = async () => {
    if (running) return
    setRunning(true)

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, input: stdin }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Execution failed")
      }

      socket?.emit("code:run", {
        roomId,
        output: data.output,
        exitCode: data.exitCode,
        runtime: data.runtime,
      })
    } catch (error) {
      socket?.emit("code:run", {
        roomId,
        output: error instanceof Error ? error.message : "Execution failed",
        exitCode: 1,
        runtime: 0,
      })
    } finally {
      setRunning(false)
    }
  }

  const handleSendChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = chatInput.trim()
    if (!trimmed || !socket) return

    socket.emit("chat:message", {
      roomId,
      text: trimmed,
    })
    setChatInput("")
  }

  useEffect(() => {
    if (!socket || !roomId || !userName || timeLeft === null) return;

    const creatorToken = localStorage.getItem("creatorToken");

    socket.emit(
      "room:join",
      {
        roomId,
        name: userName,
        creatorToken: creatorToken ?? undefined,
        role: creatorToken ? "host" : "editor",
        initialRemainingSeconds: timeLeft,
        maxParticipants: (window as any)._maxParticipants,
      },
      (response: { error?: string; locked?: boolean; timerRunning?: boolean }) => {
        if (response?.error) {
          setRoomError(new Error(response.error))
          return
        }
        if (response?.locked) {
          setRoomLocked(true)
        }
        if (typeof response?.timerRunning === "boolean") {
          setTimerRunning(response.timerRunning)
        }
      }
    )

    socket.on("participants:update", (data: Participant[]) => {
      console.log("participants data:", data)
      const prev = prevParticipantsRef.current
      const newJoins = data.filter(p => !prev.find(pp => pp.id === p.id));
      const newLeaves = prev.filter(p => !data.find(pp => pp.id === p.id));
      
      newJoins.forEach(p => {
        setSessionEvents(prevEvents => [
          { id: nanoid(), type: "join", user: p.name, color: p.color, description: "joined the room", timestamp: Date.now() },
          ...prevEvents
        ]);
      });
      newLeaves.forEach(p => {
        setSessionEvents(prevEvents => [
          { id: nanoid(), type: "leave", user: p.name, color: p.color, description: "left the room", timestamp: Date.now() },
          ...prevEvents
        ]);
      });
      
      prevParticipantsRef.current = data
      setParticipants(data);
    });

    socket.on("code:output", (data: ExecutionResult & { user?: string; color?: string }) => {
      setResult({ ...data, timestamp: Date.now() })
      setCodeRunCount(prev => prev + 1)
      setSessionEvents(prev => [
        { 
          id: nanoid(), 
          type: "run", 
          user: data.user || "System", 
          color: data.color || "#5b7fff", 
          description: "executed code", 
          timestamp: Date.now() 
        },
        ...prev
      ]);
    });

    socket.on("chat:new", (message: ChatMessage) => {
      setChatMessages((current) => [...current, message])
      setSessionEvents(prev => [
        { 
          id: nanoid(), 
          type: "chat", 
          user: message.user, 
          color: message.color, 
          description: `sent a message: ${message.text}`, 
          timestamp: Date.now() 
        },
        ...prev
      ]);
    });

    socket.on(
      "language:changed",
      ({ language, code }: { language: string; code: string }) => {
        setLanguage(language)
        setCode(code)
        localStorage.setItem(`language-${roomId}`, language)
        setSessionEvents(prev => [
          { 
            id: nanoid(), 
            type: "language_change", 
            user: "System", 
            color: "#5b7fff", 
            description: `switched language to ${language}`, 
            timestamp: Date.now() 
          },
          ...prev
        ]);
      }
    );

    socket.on("notes:changed", ({ notes }: { notes: string }) => {
      setNotes(notes)
    });

    socket.on("timer:paused", () => setTimerRunning(false))
    socket.on("timer:resumed", () => setTimerRunning(true))
    socket.on("timer:tick", ({ remainingSeconds }: { remainingSeconds: number }) => {
      setTimeLeft(remainingSeconds)
    })
    socket.on("timer:ended", () => {
      setTimeLeft(0)
      setTimerRunning(false)
    })
    socket.on("room:locked", (locked: boolean) => setRoomLocked(locked))
    socket.on("room:kicked", () => {
      socket.disconnect()
      router.push("/")
    })
    socket.on("session:ended", ({ replayId }: { replayId: string }) => {
      setSessionEnded(true)
      setReplayId(replayId)
    })

    return () => {
      socket.off("participants:update");
      socket.off("language:changed");
      socket.off("code:output");
      socket.off("chat:new");
      socket.off("notes:changed");
      socket.off("timer:paused");
      socket.off("timer:resumed");
      socket.off("timer:tick");
      socket.off("timer:ended");
      socket.off("room:locked");
      socket.off("room:kicked");
      socket.off("session:ended");
    };
  }, [socket, roomId, router, userName, timeLeft === null]);

  const myParticipant = participants.find(p => p.id === socket?.id)
  const isHost = myParticipant?.role === "host"
  const isReadOnly = myParticipant?.role === "viewer"
  const canEndSession = typeof window !== "undefined" && !!localStorage.getItem("creatorToken")
  const languageLabel = LANGUAGE_LABELS.find((label) => LANGUAGE_VALUE_BY_LABEL[label] === language) ?? language
  const userNameForYjs = userName || (typeof window !== "undefined" ? localStorage.getItem("userName") ?? "anonymous" : "anonymous")

  const { bindEditor } = useYjs({
    roomId,
    language,
    userName: userNameForYjs,
    userColor: myParticipant?.color ?? "#5b7fff",
  })

  const handleEditorMount = (monacoEditor: editor.IStandaloneCodeEditor) => {
    bindEditor(monacoEditor)
  }

  const handleLockRoom = () => {
    const creatorToken = localStorage.getItem("creatorToken")
    if (!creatorToken || !socket) return

    if (roomLocked) {
      socket.emit("room:unlock", { roomId, creatorToken })
      setRoomLocked(false)
    } else {
      socket.emit("room:lock", { roomId, creatorToken })
      setRoomLocked(true)
    }
  }

  const handleKickParticipant = (targetId: string) => {
    const creatorToken = localStorage.getItem("creatorToken")
    if (!creatorToken || !socket) return

    if (confirm("Are you sure you want to kick this participant?")) {
      socket.emit("room:kick", { roomId, creatorToken, targetId })
    }
  }

  const handleRoleChange = (targetId: string, newRole: "editor" | "viewer") => {
    const creatorToken = localStorage.getItem("creatorToken")
    if (!creatorToken || !socket) return

    socket.emit("role:change", { roomId, creatorToken, targetId, newRole })
  }

  const handleNotesChange = (nextNotes: string) => {
    setNotes(nextNotes)
    socket?.emit("notes:update", { roomId, notes: nextNotes })
  }

  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = joinName.trim()
    if (!trimmed) {
      setJoinError("Enter a display name.")
      return
    }

    setJoinLoading(true)
    localStorage.setItem("userName", trimmed)
    setUserName(trimmed)
    setJoinPromptOpen(false)
    setJoinLoading(false)
  }

  const handleEndSession = () => {
    const creatorToken = localStorage.getItem("creatorToken")
    if (!creatorToken || !socket) return

    if (confirm("Are you sure you want to end the session? This will kick all participants and close the room.")) {
      socket.emit("session:end", { roomId, creatorToken })
    }
  }

  const handleExitRoom = () => {
    if (confirm("Are you sure you want to exit this room?")) {
      socket?.disconnect()
      router.push("/")
    }
  }

  const getRelativeTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000)
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Topbar
        roomId={roomId}
        language={language}
        isReadOnly={isReadOnly}
        running={running}
        timeLeft={timeLeft}
        timerRunning={timerRunning}
        roomLocked={roomLocked}
        myParticipant={myParticipant}
        isHost={isHost}
        canEndSession={canEndSession}
        onLanguageChange={handleLanguageChange}
        onRun={handleRun}
        onToggleTimer={handleToggleTimer}
        onLockRoom={handleLockRoom}
        onEndSession={handleEndSession}
        onExitRoom={handleExitRoom}
        onOpenShare={() => setShareOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {joinPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-100">Enter your display name</h2>
            <p className="mt-2 text-sm text-zinc-400">This name will appear for other participants in the room.</p>
            <form onSubmit={handleJoinSubmit} className="mt-4 space-y-4">
              <label className="block text-sm text-zinc-300">
                <span className="sr-only">Display name</span>
                <input
                  value={joinName}
                  onChange={(event) => {
                    setJoinName(event.target.value)
                    if (joinError) setJoinError("")
                  }}
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
      )}

      <section className="mx-auto grid w-full max-w-425 flex-1 gap-3 p-3 md:grid-cols-[1fr_340px]">
        <EditorPanel
          language={language}
          activeEditorTab={activeEditorTab}
          code={code}
          notes={notes}
          editorSettings={editorSettings}
          isReadOnly={isReadOnly}
          running={running}
          timeLeft={timeLeft}
          onActiveEditorTabChange={setActiveEditorTab}
          onLanguageChange={handleLanguageChange}
          onRun={handleRun}
          onCodeChange={setCode}
          onNotesChange={handleNotesChange}
          onEditorMount={handleEditorMount}
        />

        <RightPanel
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          result={result}
          running={running}
          stdin={stdin}
          onStdinChange={setStdin}
          chatMessages={chatMessages}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSendChat={handleSendChat}
          elapsedTime={elapsedTime}
          participants={participants}
          codeRunCount={codeRunCount}
          languageLabel={languageLabel}
          sessionEvents={sessionEvents}
          activityEndRef={activityEndRef}
          getRelativeTime={getRelativeTime}
          isHost={isHost}
          currentSocketId={socket?.id}
          onRoleChange={handleRoleChange}
          onKickParticipant={handleKickParticipant}
        />
      </section>

      {shareOpen && (
        <ShareModal
          roomId={roomId}
          onClose={() => setShareOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          settings={editorSettings}
          onUpdate={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {sessionEnded && (
        <SessionEndedModal
          replayId={replayId}
          onClose={() => setSessionEnded(false)}
        />
      )}
    </main>
  );
}

export default function RoomPage({ params }: RoomPageProps) {
  return <RoomPageInner params={params} />
}
