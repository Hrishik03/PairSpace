"use client"

import type { editor } from "monaco-editor"
import { Play } from "lucide-react"
import MonacoEditor from "@/components/editor/MonacoEditor"
import { Button } from "@/components/ui/button"
import type { EditorSettings } from "@/components/room/SettingsModal"
import {
  LANGUAGE_EXTENSION,
  LANGUAGE_LABELS,
  LANGUAGE_VALUE_BY_LABEL,
  formatTime,
} from "@/lib/editor-config"

type EditorPanelProps = {
  language: string
  activeEditorTab: "solution" | "notes"
  code: string
  notes: string
  editorSettings: EditorSettings
  isReadOnly: boolean
  running: boolean
  timeLeft: number | null
  onActiveEditorTabChange: (tab: "solution" | "notes") => void
  onLanguageChange: (language: string) => void
  onRun: () => void
  onCodeChange: (value: string) => void
  onNotesChange: (value: string) => void
  onEditorMount: (monacoEditor: editor.IStandaloneCodeEditor) => void
}

export default function EditorPanel({
  language,
  activeEditorTab,
  code,
  notes,
  editorSettings,
  isReadOnly,
  running,
  timeLeft,
  onActiveEditorTabChange,
  onLanguageChange,
  onRun,
  onCodeChange,
  onNotesChange,
  onEditorMount,
}: EditorPanelProps) {
  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900">

      <div className="flex items-end gap-1 border-b border-zinc-800 bg-zinc-900/80 px-3 pt-2">
       {([
         { key: "solution", label: LANGUAGE_EXTENSION[language] },
         { key: "notes", label: "notes.md" },
       ] as const).map(({ key, label }) => (
         <div
           key={key}
           onClick={() => onActiveEditorTabChange(key)}
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
          disabled={isReadOnly}
          onChange={(event) => onLanguageChange(event.target.value)}
          className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-300 outline-none disabled:opacity-50"
        >
          {LANGUAGE_LABELS.map((lang) => (
            <option key={lang} value={LANGUAGE_VALUE_BY_LABEL[lang]}>
              {lang}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={onRun}
          disabled={running || isReadOnly}
          className="h-8 cursor-pointer bg-emerald-400 text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
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

      <div className="h-[75vh] overflow-hidden bg-zinc-950">
        {activeEditorTab === "solution" ? (
          <MonacoEditor
            language={language}
            value={code}
            settings={editorSettings}
            readOnly={isReadOnly}
            onChange={(value) => {
              onCodeChange(value ?? "")
            }}
            onMount={onEditorMount}
          />
          ) : (
          <textarea
            value={notes}
            readOnly={isReadOnly}
            onChange={(e) => {
              onNotesChange(e.target.value)
            }}
            // ref={notesRef}
            placeholder="Shared scratchpad â€” paste problem statement, links, or ideas here..."
            className="h-full w-full resize-none bg-zinc-950 p-4 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        )}
      </div>

      {/* <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-1">
        <div className="flex items-center gap-2 text-md text-zinc-500">
          <Users className="size-4" />
          {participants.length} participant{participants.length === 1 ? "" : "s"} online
        </div>
      </div> */}
    </div>
  )
}
