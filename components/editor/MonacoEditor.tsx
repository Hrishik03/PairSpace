"use client"
import dynamic from "next/dynamic"
import type * as Monaco from "monaco-editor"

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

interface Props {
    language: string,
    value: string,
    onChange: (value: string) => void,
    onMount?: (editor: Monaco.editor.IStandaloneCodeEditor) => void,
    settings?: {
      theme: string
      fontSize: number
      wordWrap: "on" | "off"
    }
}

export default function MonacoEditor({ language, value, onChange, onMount, settings }: Props) {
    const handleEditorChange = (nextValue: string | undefined) => {
      onChange(nextValue ?? "")
    }

    return (
      <Editor
        height="100%"
        theme={settings?.theme ?? "vs-dark"}
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={onMount}
        options={{
          fontSize: settings?.fontSize ?? 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          wordWrap: settings?.wordWrap ?? "on",
          automaticLayout: true,
        }}
      />
    )
  }