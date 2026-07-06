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
    },
    readOnly?: boolean
}

export default function MonacoEditor({ language, value, onChange, onMount, settings, readOnly }: Props) {
    const handleEditorChange = (nextValue: string | undefined) => {
      if (readOnly) return
      onChange(nextValue ?? "")
    }

    return (
      <Editor
        height="100%"
        theme={settings?.theme ?? "vs-dark"}
        language={language}
        defaultValue={value}
        onChange={handleEditorChange}
        onMount={onMount}
        options={{
          fontSize: settings?.fontSize ?? 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          wordWrap: settings?.wordWrap ?? "on",
          automaticLayout: true,
          readOnly: readOnly ?? false,
          domReadOnly: readOnly ?? false,
        }}
      />
    )
  }
