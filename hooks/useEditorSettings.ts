"use client"

import { useEffect, useState } from "react"
import type { EditorSettings } from "@/components/room/SettingsModal"

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  theme: "vs-dark",
  fontSize: 14,
  wordWrap: "on",
  keybindings: "standard",
}

export function useEditorSettings() {
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS)

  useEffect(() => {
    const saved = localStorage.getItem("editorSettings")
    if (saved) {
      setEditorSettings(JSON.parse(saved))
    }
  }, [])

  const updateSettings = (newSettings: EditorSettings) => {
    setEditorSettings(newSettings)
    localStorage.setItem("editorSettings", JSON.stringify(newSettings))
  }

  return { editorSettings, updateSettings }
}
