"use client"

import { useEffect, useRef, useState } from "react"
import type * as Monaco from "monaco-editor"
import { CODE_TEMPLATE_BY_LANGUAGE } from "@/lib/editor-config"

type AwarenessUser = {
  name: string
  color: string
  colorLight?: string
}

type AwarenessState = {
  user?: AwarenessUser
}

type AwarenessProviderLike = {
  awareness: {
    setLocalStateField: (field: string, value: AwarenessUser) => void
  }
}

type YDocLike = {
  transact: (callback: () => void) => void
  destroy: () => void
}

type YTextLike = {
  length: number
  insert: (index: number, text: string) => void
}

const DEFAULT_REMOTE_COLOR = "#5b7fff"
const DEFAULT_REMOTE_COLOR_LIGHT = `${DEFAULT_REMOTE_COLOR}33`
const WS_SERVER_URL = process.env.NEXT_PUBLIC_WS_SERVER_URL ?? "http://localhost:3001"

const escapeCssString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")

const getYjsServerUrl = () => {
  const url = new URL(WS_SERVER_URL)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = "/yjs"
  return url.toString()
}

const safeCursorColor = (color: string | undefined, fallback: string) =>
  color && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)
    ? color
    : fallback

const withAlpha = (color: string, alpha: string) =>
  /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : DEFAULT_REMOTE_COLOR_LIGHT

type ProviderLike = {
  awareness: {
    setLocalStateField: (field: string, value: AwarenessUser) => void
    getStates: () => Map<number, AwarenessState>
    on: (event: string, callback: () => void) => void
  }
  once: (event: string, callback: (synced: boolean) => void) => void
  destroy: () => void
}

interface UseYjsProps {
  roomId: string
  language: string
  userName: string
  userColor: string
  shouldInitializeDocument: boolean
}

export function useYjs({
  roomId,
  language,
  userName,
  userColor,
  shouldInitializeDocument,
}: UseYjsProps) {
  const bindingRef = useRef<unknown>(null)
  const providerRef = useRef<unknown>(null)
  const ydocRef = useRef<YDocLike | null>(null)
  const ytextRef = useRef<YTextLike | null>(null)
  const languageRef = useRef(language)
  const userNameRef = useRef(userName)
  const userColorRef = useRef(userColor)
  const shouldInitializeDocumentRef = useRef(shouldInitializeDocument)
  const [isSynced, setIsSynced] = useState(false)

  useEffect(() => {
    languageRef.current = language
  }, [language])

  const initializeEmptyDocument = () => {
    const ydoc = ydocRef.current
    const ytext = ytextRef.current
    if (!shouldInitializeDocumentRef.current || !ydoc || !ytext || ytext.length > 0) return

    const boilerplate = CODE_TEMPLATE_BY_LANGUAGE[languageRef.current] ?? ""
    if (boilerplate) {
      ydoc.transact(() => ytext.insert(0, boilerplate))
    }
  }

  const publishLocalUser = (provider: AwarenessProviderLike) => {
    const name = userNameRef.current.trim()
    if (!name) return

    const color = safeCursorColor(userColorRef.current, DEFAULT_REMOTE_COLOR)
    provider.awareness.setLocalStateField("user", {
      name,
      color,
      colorLight: withAlpha(color, "33"),
    })
  }

  useEffect(() => {
    userNameRef.current = userName
    userColorRef.current = userColor

    const provider = providerRef.current as ProviderLike | null
    if (provider?.awareness) publishLocalUser(provider)
  }, [userName, userColor])

  useEffect(() => {
    shouldInitializeDocumentRef.current = shouldInitializeDocument
    initializeEmptyDocument()
  }, [shouldInitializeDocument])

  const bindEditor = async (editor: Monaco.editor.IStandaloneCodeEditor) => {
    const Y = await import("yjs")
    const { WebsocketProvider } = await import("y-websocket")
    const { MonacoBinding } = await import("y-monaco")

    if (bindingRef.current) {
      (bindingRef.current as { destroy: () => void }).destroy()
      bindingRef.current = null
    }
    if (providerRef.current) {
      (providerRef.current as { destroy: () => void }).destroy()
      providerRef.current = null
    }
    if (ydocRef.current) {
      ydocRef.current.destroy()
      ydocRef.current = null
    }
    ytextRef.current = null

    const ydoc = new Y.Doc()
    const ytext = ydoc.getText("monaco")
    ydocRef.current = ydoc
    ytextRef.current = ytext

    setIsSynced(false)

    const provider = new WebsocketProvider(
      getYjsServerUrl(),
      roomId,
      ydoc
    )
    providerRef.current = provider

    publishLocalUser(provider)
    provider.on("status", () => publishLocalUser(provider))

    provider.once("sync", (synced: boolean) => {
      setIsSynced(synced)
      publishLocalUser(provider)
      if (synced) {
        initializeEmptyDocument()
      }
    })

    // Use document head for styles to avoid DOM issues
    let styleEl = document.getElementById("yjs-cursor-styles") as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = "yjs-cursor-styles"
      document.head.appendChild(styleEl)
    }

    const updateStyles = () => {
      const states = provider.awareness.getStates()
      let css = `
        .yRemoteSelection {
          background-color: var(--remote-color-light, ${DEFAULT_REMOTE_COLOR_LIGHT}) !important;
        }
        .yRemoteSelectionHead {
          position: absolute;
          border-left: 2px solid var(--remote-color, ${DEFAULT_REMOTE_COLOR});
          height: 100%;
          box-sizing: border-box;
          overflow: visible;
          z-index: 5;
        }
        .yRemoteSelectionHead::after {
          content: "User";
          position: absolute;
          top: -0.35em;
          left: 3px;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 10px;
          line-height: 1.2;
          padding: 1px 5px;
          border-radius: 2px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          pointer-events: none;
          z-index: 100;
          background-color: var(--remote-color, ${DEFAULT_REMOTE_COLOR}) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transform: translateY(-100%);
        }
      `

      states.forEach((state, clientID) => {
        if (clientID === ydoc.clientID) return
        const color = safeCursorColor(state.user?.color, DEFAULT_REMOTE_COLOR)
        const colorLight = safeCursorColor(state.user?.colorLight, withAlpha(color, "33"))
        const label = state.user?.name?.trim() || `User ${clientID}`

        css += `
          .yRemoteSelection-${clientID}, 
          .yRemoteSelectionHead-${clientID} {
            --remote-color: ${color};
            --remote-color-light: ${colorLight};
          }
          .yRemoteSelectionHead-${clientID}::after {
            content: "${escapeCssString(label)}" !important;
          }
        `
      })
      styleEl.innerHTML = css
    }

    provider.awareness.on("change", updateStyles)
    updateStyles()

    if (!shouldInitializeDocumentRef.current) {
      editor.getModel()?.setValue("")
    }

    const binding = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      provider.awareness
    )

    bindingRef.current = binding
  }

  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        (bindingRef.current as { destroy: () => void }).destroy()
        bindingRef.current = null
      }
      if (providerRef.current) {
        (providerRef.current as { destroy: () => void }).destroy()
        providerRef.current = null
      }
      if (ydocRef.current) {
        ydocRef.current.destroy()
        ydocRef.current = null
      }
      ytextRef.current = null
    }
  }, [])

  return { bindEditor, isSynced }
}
