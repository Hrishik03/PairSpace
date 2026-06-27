"use client"

import TerminalPanel from "@/components/editor/TerminalPanel"
import type { ExecutionResult } from "@/types/room"

type OutputTabProps = {
  result: ExecutionResult | null
  running: boolean
  stdin: string
  onStdinChange: (value: string) => void
}

export default function OutputTab({
  result,
  running,
  stdin,
  onStdinChange,
}: OutputTabProps) {
  return (
    <TerminalPanel
      result={result}
      running={running}
      stdin={stdin}
      onStdinChange={onStdinChange}
    />
  )
}
