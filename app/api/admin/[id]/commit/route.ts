import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/firebase-admin"
import { saveMappingAndEnqueue } from "@/lib/server/commit"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth(req)
  const { mapping } = await req.json()

  await saveMappingAndEnqueue(params.id, mapping, user.uid)
  return NextResponse.json({ ok: true })
}
