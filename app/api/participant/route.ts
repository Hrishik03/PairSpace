import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { roomId, name, color, role } = await req.json()

  try {
    await prisma.participant.create({
      data: { roomId, name, color, role }
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Failed to save participant:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}