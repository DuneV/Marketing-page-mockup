import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/firebase-admin"
import { getImportById, getActiveSchema } from "@/lib/server/imports-db"
import { analyzeExcelFromGcs } from "@/lib/server/analyze"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAuth(req)

  const imp = await getImportById(params.id)
  const schema = await getActiveSchema(imp.client_id, imp.import_type)

  const result = await analyzeExcelFromGcs(imp.gcs_uri, schema, 50)

  // guarda resultado en imports.analyze_result y status=ANALYZED si quieres
  return NextResponse.json({ ...result, schema })
}
