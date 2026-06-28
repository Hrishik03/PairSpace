export function getCreatorToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("creatorToken")
}
