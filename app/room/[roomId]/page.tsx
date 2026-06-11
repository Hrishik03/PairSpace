"use client";
import { use, useEffect, useState, type FormEvent } from "react";
import { useYjs } from "@/hooks/useYjs"
import type { editor } from "monaco-editor"
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock3,
  Code2,
  Copy,
  PauseCircle,
  PlayCircle,
  Play,
  Settings,
  TerminalSquare,
  Users,
} from "lucide-react";
import ShareModal from "@/components/room/ShareModal"
import SettingsModal, { EditorSettings } from "@/components/room/SettingsModal"
import MonacoEditor from "@/components/editor/MonacoEditor";
import { Suspense } from "react"
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSockets"
import {
  LANGUAGE_VALUE_BY_LABEL,
  LANGUAGE_LABELS,
  CODE_TEMPLATE_BY_LANGUAGE,
  LANGUAGE_EXTENSION,
  formatTime,
} from "@/lib/editor-config"

type Participant = {
  id: string
  name: string
  color: string
  role: string
  status: string
}

type ExecutionResult = {
  output: string
  exitCode: number
  runtime: number
  timestamp: number
}

type ChatMessage = {
  text: string
  user: string
  color: string
  timestamp: number
}

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
};

// const editorTabs = ["solution.ts", "notes.md"];


export function RoomPageInner({ params }: RoomPageProps) {
  const { roomId } = use(params);
  const router = useRouter();
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
  const socket = useSocket()
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

  const updateSettings = (newSettings: EditorSettings) => {
    setEditorSettings(newSettings)
    localStorage.setItem("editorSettings", JSON.stringify(newSettings))
  }

  useEffect(() => {
  fetch(`/api/room?roomId=${roomId}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        router.push("/")
        return
      }
      setLanguage(data.language)
      localStorage.setItem(`language-${roomId}`, data.language)
      setTimeLeft(typeof data.remainingSeconds === "number" ? data.remainingSeconds : data.durationMinutes * 60)
      // Store maxParticipants temporarily to pass to socket
      ;(window as any)._maxParticipants = data.maxParticipants
    })
}, [roomId, router])

  const handleLanguageChange = (newLanguage: string) => {
    const nextCode = CODE_TEMPLATE_BY_LANGUAGE[newLanguage] ?? ""
    setLanguage(newLanguage)
    localStorage.setItem(`language-${roomId}`, newLanguage)
    setCode(nextCode)
    socket?.emit("language:change", { roomId, language: newLanguage, code: nextCode })
  };

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

    // broadcast to everyone in room via socket
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
          alert(response.error)
          router.push("/")
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
      setParticipants(data);
    });

    socket.on("code:output", (data: ExecutionResult) => {
      setResult({ ...data, timestamp: Date.now() })
    });

    socket.on("chat:new", (message: ChatMessage) => {
      setChatMessages((current) => [...current, message])
    });

    socket.on(
      "language:changed",
      ({ language, code }: { language: string; code: string }) => {
        setLanguage(language)
        setCode(code)
        localStorage.setItem(`language-${roomId}`, language)
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

    // socket.off("notes:changed")

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
    };
  }, [socket, roomId, router, userName, timeLeft === null]);

  // Removed local interval

  const myParticipant = participants.find(p => p.id === socket?.id)
  const isHost = myParticipant?.role === "host"

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

    socket.emit("room:kick", { roomId, creatorToken, targetId })
  }

  const handleRoleChange = (targetId: string, newRole: "editor" | "viewer") => {
    const creatorToken = localStorage.getItem("creatorToken")
    if (!creatorToken || !socket) return

    socket.emit("role:change", { roomId, creatorToken, targetId, newRole })
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

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex w-full max-w-425 flex-wrap items-center gap-2 px-3 py-2 md:px-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <Code2 className="size-4 text-blue-400" />
            PairSpace
          </Link>
          <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
            {roomId}
          </span>
          <div className="mx-auto hidden items-center gap-2 lg:flex">
            <select
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value)}
              className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-300 outline-none"
            >
              {LANGUAGE_LABELS.map((lang) => (
                <option key={lang} value={LANGUAGE_VALUE_BY_LABEL[lang]}>
                  {lang}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleRun}
              disabled={running}
              className="h-8 bg-emerald-400 text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
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
                  onClick={() => {
                    const creatorToken = localStorage.getItem("creatorToken")
                    if (!creatorToken) return
                    if (timerRunning) {
                      socket?.emit("timer:pause", { roomId, creatorToken })
                    } else {
                      socket?.emit("timer:resume", { roomId, creatorToken })
                    }
                  }}
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
          <span className="ml-auto inline-flex items-center gap-2 text-xs text-zinc-500">
            <span className="size-2 rounded-full bg-emerald-400" />
            Sync healthy
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
             {myParticipant?.role ?? "connecting..."}
            </span>
            {isHost && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLockRoom}
                className="cursor-pointer h-8 border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
              >
                {roomLocked ? "Unlock room" : "Lock room"}
              </Button>
            )}
            <Button size="sm"
             variant="outline"
             onClick={() => setShareOpen(true)}
             className="h-8 border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
             >
              <Copy className="size-3.5" />
              Share
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setSettingsOpen(true)}
              className="h-8 border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
            >
              <Settings className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

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
                  {joinLoading ? "Joining..." : "Join room"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="mx-auto grid w-full max-w-425 flex-1 gap-3 p-3 md:grid-cols-[1fr_340px]">
        <div className="grid min-h-[75vh] grid-rows-[auto_auto_1fr_auto] rounded-xl border border-zinc-800 bg-zinc-900">

          <div className="flex items-end gap-1 border-b border-zinc-800 bg-zinc-900/80 px-3 pt-2">
           {([
             { key: "solution", label: LANGUAGE_EXTENSION[language] },
             { key: "notes", label: "notes.md" },
           ] as const).map(({ key, label }) => (
             <div
               key={key}
               onClick={() => setActiveEditorTab(key)}
               className={`cursor-pointer rounded-t-md border border-zinc-700 px-3 py-1.5 text-xs ${
                 activeEditorTab === key
                   ? "border-b-zinc-950 bg-zinc-950 text-zinc-200"
                   : "border-b-transparent bg-zinc-900 text-zinc-500 hover:text-zinc-300"
               }`}
             >
               {label}
             </div>
           ))}
         </div>

          <div className="flex flex-wrap gap-2 border-b border-zinc-800 px-3 py-2 lg:hidden">
            <select
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value)}
              className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-300 outline-none"
            >
              {LANGUAGE_LABELS.map((lang) => (
                <option key={lang} value={LANGUAGE_VALUE_BY_LABEL[lang]}>
                  {lang}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleRun}
              disabled={running}
              className="h-8 bg-emerald-400 text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
            >
              <Play className="size-3.5" />
              {running ? "Running..." : "Run"}
            </Button>
             <span className={`inline-flex h-8 items-center rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs ${
              timeLeft !== null && timeLeft <= 300 ? "text-red-400" : "text-amber-300"
               }`}>
              {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
            </span>
          </div>

          <div className="h-[60vh] overflow-hidden bg-zinc-950">
            {activeEditorTab === "solution" ? (
              <MonacoEditor
                language={language}
                value={code}
                settings={editorSettings}
                onChange={(value) => {
                  setCode(value ?? "")
                }}
                onMount={handleEditorMount}
              />
              ) : (
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  socket?.emit("notes:update", { roomId, notes: e.target.value })
                }}
                // ref={notesRef}
                placeholder="Shared scratchpad — paste problem statement, links, or ideas here..."
                className="h-full w-full resize-none bg-zinc-950 p-4 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
              />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-1">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Users className="size-4" />
              {participants.length} participant{participants.length === 1 ? "" : "s"} online
            </div>
            <span className="text-xs text-zinc-500">Ln 6, Col 34</span>
          </div>
        </div>

        <aside className="grid min-h-[75vh] grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="grid grid-cols-3 border-b border-zinc-800 text-center text-xs">
            <button
              type="button"
              className={`px-2 py-2 ${activeTab === "output" ? "border-b-2 border-blue-400 text-blue-300" : "text-zinc-500"}`}
              onClick={() => setActiveTab("output")}
            >
              Output
            </button>
            <button
              type="button"
              className={`px-2 py-2 ${activeTab === "chat" ? "border-b-2 border-blue-400 text-blue-300" : "text-zinc-500"}`}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
            <button
              type="button"
              className={`px-2 py-2 ${activeTab === "replay" ? "border-b-2 border-blue-400 text-blue-300" : "text-zinc-500"}`}
              onClick={() => setActiveTab("replay")}
            >
              Replay
            </button>
          </div>

          <div className="overflow-hidden p-3">
            {activeTab === "output" ? (
              <div className="space-y-1 overflow-auto font-mono text-xs">
                <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2 text-xs text-zinc-400">
                  <TerminalSquare className="size-3.5" />
                  {result ? `Last run · ${new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "No runs yet"}
                  {result && (
                    <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs ${
                      result.exitCode === 0
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}>
                      {result.exitCode === 0 ? "Passed" : "Error"}
                    </span>
                  )}
                </div>

                {result ? (
                  <>
                    <p className="text-zinc-500">$ {languageLabel.toLowerCase()} solution</p>
                    <p className={result.exitCode === 0 ? "text-emerald-300" : "text-red-400"}>
                      {result.output}
                    </p>
                    {result.runtime && (
                      <p className="pt-2 text-zinc-500">
                        {/* Runtime {Math.round(result.runtime * 1000)}ms · Exit code {result.exitCode} */}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-zinc-500">Hit Run to execute code</p>
                )}

                <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-2">
                  <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
                    Standard input
                  </label>
                  <textarea
                    value={stdin}
                    onChange={(event) => setStdin(event.target.value)}
                    placeholder="Enter input for your program"
                    className="min-h-25 w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            ) : activeTab === "chat" ? (
              <div className="flex h-full flex-col gap-3">
                <div className="space-y-3 overflow-auto pr-1">
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
                </div>
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <Button type="submit" className="h-10 px-4 bg-blue-500 text-white hover:bg-blue-400 focus-visible:ring-blue-400">
                    Send
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-500">
                <p className="mb-2 text-zinc-300">Replay is coming soon.</p>
                <p>Use the chat tab to collaborate in real time.</p>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Participants</p>
            <div className="space-y-2 text-xs">
              {participants.map((p) => {
                const showHostActions = isHost && p.id !== socket?.id && p.role !== "host"

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
                        {p.id === socket?.id && (
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
                          onChange={(event) => handleRoleChange(p.id, event.target.value as "editor" | "viewer")}
                          className="h-8 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-200 outline-none"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => handleKickParticipant(p.id)}
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
        </aside>
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
    </main>
  );
}

export default function RoomPage({ params }: RoomPageProps) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading room...
      </div>
    }>
      <RoomPageInner params={params} />
    </Suspense>
  )
}
