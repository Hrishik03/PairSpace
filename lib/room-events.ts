import { nanoid } from "nanoid"
import type { SessionEvent } from "@/types/room"

export function createSessionEvent(
  type: SessionEvent["type"],
  user: string,
  color: string,
  description: string
): SessionEvent {
  return { id: nanoid(), type, user, color, description, timestamp: Date.now() }
}
