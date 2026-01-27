import type { AuthContext } from "../middleware/requireAuth.js"
import { admin } from "./firebaseAdmin.js"

export async function assertCampaignAccess(ctx: AuthContext, campaignId: string) {
  if (ctx.role === "admin") return

  if (ctx.role === "company") {
    if (!ctx.companyId) {
      const e: any = new Error("NO_COMPANY_ID")
      e.status = 403
      throw e
    }

    const snap = await admin.firestore().doc(`campaigns/${campaignId}`).get()
    if (!snap.exists) {
      const e: any = new Error("CAMPAIGN_NOT_FOUND")
      e.status = 404
      throw e
    }

    const empresaId = String(snap.data()?.empresaId ?? "")
    if (empresaId !== String(ctx.companyId)) {
      const e: any = new Error("FORBIDDEN_CAMPAIGN")
      e.status = 403
      throw e
    }

    return
  }

  const e: any = new Error("FORBIDDEN")
  e.status = 403
  throw e
}
