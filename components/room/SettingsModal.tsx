"use client"
import React from "react"
import { X, Type, Palette, WrapText, Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface EditorSettings {
  theme: string
  fontSize: number
  wordWrap: "on" | "off"
  keybindings: "standard" | "vim"
}

interface Props {
  settings: EditorSettings
  onUpdate: (settings: EditorSettings) => void
  onClose: () => void
}

export default function SettingsModal({ settings, onUpdate, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">Editor Settings</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Theme */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Palette className="size-4" />
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "vs-dark", label: "Dark" },
                { id: "light", label: "Light" },
                { id: "hc-black", label: "High Contrast" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => onUpdate({ ...settings, theme: t.id })}
                  className={`px-3 py-2 text-xs rounded-md border transition-all ${
                    settings.theme === t.id
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                <Type className="size-4" />
                Font Size
              </label>
              <span className="text-xs font-mono text-zinc-500">{settings.fontSize}px</span>
            </div>
            <input
              type="range"
              min="12"
              max="24"
              step="1"
              value={settings.fontSize}
              onChange={(e) => onUpdate({ ...settings, fontSize: parseInt(e.target.value) })}
              className="w-full h-1.5 rounded-lg bg-zinc-800 accent-blue-500 cursor-pointer appearance-none"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
              <span>12px</span>
              <span>24px</span>
            </div>
          </div>

          {/* Word Wrap */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950/30">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <WrapText className="size-4 text-zinc-500" />
              Word Wrap
            </label>
            <button
              onClick={() => onUpdate({ ...settings, wordWrap: settings.wordWrap === 'on' ? 'off' : 'on' })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                settings.wordWrap === 'on' ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  settings.wordWrap === 'on' ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-8">
          <Button 
            onClick={onClose} 
            className="w-full h-11 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-medium rounded-xl cursor-pointer"
          >
            Save and Close
          </Button>
        </div>
      </div>
    </div>
  )
}
