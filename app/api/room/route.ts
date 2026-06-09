import { nanoid } from "nanoid"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  const roomId = nanoid(8)
  const creatorToken = nanoid(16)

  const expiresAt = new Date(
    Date.now() + (body.durationMinutes ?? 60) * 60 * 1000
  )

  await prisma.room.create({
    data: {
      id: roomId,
      creatorToken,
      language: body.language ?? "typescript",
      durationMinutes: body.durationMinutes ?? 60,
      expiresAt,
    },
  })

  return NextResponse.json({ roomId, creatorToken })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")

  if (!roomId) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
  })

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  const expiresAt = room.expiresAt.getTime()
  const remainingSeconds = Math.max(0, Math.round((expiresAt - Date.now()) / 1000))

  return NextResponse.json({
    language: room.language,
    durationMinutes: room.durationMinutes,
    expiresAt: room.expiresAt.toISOString(),
    remainingSeconds,
  })
}