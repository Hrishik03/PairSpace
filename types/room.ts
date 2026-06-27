export type Participant = {
  id: string
  name: string
  color: string
  role: string
  status: string
}

export type ExecutionResult = {
  output: string
  exitCode: number
  runtime: number
  timestamp: number
}

export type ChatMessage = {
  text: string
  user: string
  color: string
  timestamp: number
}

export type SessionEvent = {
  id: string
  type: "join" | "leave" | "run" | "language_change" | "chat"
  user: string
  color: string
  description: string
  timestamp: number
}
