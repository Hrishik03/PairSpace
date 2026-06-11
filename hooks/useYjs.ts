"use client"

import { useEffect, useRef } from "react"
import type * as Monaco from "monaco-editor"

interface UseYjsProps {
  roomId: string
  language: string
  userName: string
  userColor: string
}

export function useYjs({ roomId, userName, userColor }: UseYjsProps) {
  const bindingRef = useRef<unknown>(null)
  const providerRef = useRef<unknown>(null)
  const ydocRef = useRef<unknown>(null)

  useEffect(() => {
    if (providerRef.current && (providerRef.current as any).awareness) {
      const provider = providerRef.current as any
      provider.awareness.setLocalStateField("user", {
        name: userName,
        color: userColor,
        colorLight: userColor + "33",
      })
    }
  }, [userName, userColor])

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
      (ydocRef.current as { destroy: () => void }).destroy()
      ydocRef.current = null
    }

    const ydoc = new Y.Doc()
    const ytext = ydoc.getText("monaco")

    const provider = new WebsocketProvider(
      "ws://localhost:3001/yjs",
      roomId,
      ydoc
    )

    provider.awareness.setLocalStateField("user", {
      name: userName,
      color: userColor,
      colorLight: userColor + "33",
    })

    const styleEl = document.createElement("style")
    styleEl.id = "yjs-cursor-styles"
    editor.getDomNode()?.appendChild(styleEl)

    const updateStyles = () => {
      const states = provider.awareness.getStates()
      let css = `
        .yRemoteSelection {
          background-color: #5b7fff33;
        }
        .yRemoteSelectionHead {
          position: absolute;
          border-left: 2px solid #5b7fff;
          border-top: 2px solid #5b7fff;
          height: 100%;
          box-sizing: border-box;
        }
        .yRemoteSelectionHead::after {
          position: absolute;
          top: -1.4em;
          left: -2px;
          font-size: 11px;
          padding: 1px 4px;
          border-radius: 4px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
        }
      `

      states.forEach((state: any, clientID: number) => {
        if (clientID === ydoc.clientID) return
        if (state.user) {
          const { color, name } = state.user
          const colorLight = state.user.colorLight || color + "33"
          css += `
            .yRemoteSelection-${clientID} {
              background-color: ${colorLight} !important;
            }
            .yRemoteSelectionHead-${clientID} {
              border-color: ${color} !important;
            }
            .yRemoteSelectionHead-${clientID}::after {
              content: "${name}";
              background-color: ${color} !important;
            }
          `
        }
      })
      styleEl.innerHTML = css
    }

    provider.awareness.on("change", updateStyles)
    updateStyles()

    const binding = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      provider.awareness
    )

    ydocRef.current = ydoc
    providerRef.current = provider
    bindingRef.current = binding
  }

  // // ── ADD THIS FUNCTION ──
  // const bindNotes = async (textarea: HTMLTextAreaElement) => {
  //   const ydoc = ydocRef.current
  //   if (!ydoc) return

  //   const Y = await import("yjs")
  //   const yNotes = (ydoc as InstanceType<typeof Y.Doc>).getText("notes")

  //   // yjs → textarea
  //   const observer = () => {
  //     const val = yNotes.toString()
  //     if (textarea.value !== val) textarea.value = val
  //   }
  //   yNotes.observe(observer)

  //   // textarea → yjs
  //   const onInput = () => {
  //     const newVal = textarea.value
  //     const current = yNotes.toString()
  //     if (newVal !== current) {
  //       ;(ydoc as InstanceType<typeof Y.Doc>).transact(() => {
  //         yNotes.delete(0, yNotes.length)
  //         yNotes.insert(0, newVal)
  //       })
  //     }
  //   }
  //   textarea.addEventListener("input", onInput)

  //   // cleanup stored on textarea element for later
  //   ;(textarea as unknown as Record<string, unknown>)._yjsCleanup = () => {
  //     yNotes.unobserve(observer)
  //     textarea.removeEventListener("input", onInput)
  //   }
  // }

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
        (ydocRef.current as { destroy: () => void }).destroy()
        ydocRef.current = null
      }
    }
  }, [])

  return { bindEditor }
}