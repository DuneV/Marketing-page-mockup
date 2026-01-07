// services/import-api/src/routes/admin-companies.ts
import { Router } from "express"
import crypto from "crypto"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { query, queryOne } from "../lib/db.js"
import { admin } from "../lib/firebaseAdmin.js"

export const adminCompaniesRouter = Router()

adminCompaniesRouter.get("/", async (req, res) => {
  try {
    await requireAdmin(req)
    const rows = await query(
      `select id, name, type, size, status, products,
              coalesce(total_campaigns,0) as "totalCampañas",
              coalesce(total_investment,0) as "inversionTotal",
              created_at as "fechaCreacion"
       from marketing.companies
       order by created_at desc nulls last`
    )
    return res.json({ companies: rows })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

adminCompaniesRouter.get("/:companyId", async (req, res) => {
  try {
    await requireAdmin(req)
    const { companyId } = req.params

    const row = await queryOne(
      `select id, name, type, size, status, products,
              coalesce(total_campaigns,0) as "totalCampañas",
              coalesce(total_investment,0) as "inversionTotal",
              created_at as "fechaCreacion"
       from marketing.companies
       where id = $1`,
      [companyId]
    )

    if (!row) return res.status(404).json({ error: "Company not found" })
    return res.json({ company: row })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})


adminCompaniesRouter.patch("/:companyId/campaign-stats", async (req, res) => {
  try {
    await requireAdmin(req)
    const { companyId } = req.params
    const deltaCampaigns = Number(req.body?.deltaCampaigns ?? 0)
    const deltaBudget = Number(req.body?.deltaBudget ?? 0)

    if (!Number.isFinite(deltaCampaigns) || !Number.isFinite(deltaBudget)) {
      return res.status(400).json({ error: "Invalid deltas" })
    }

    const updated = await queryOne(
      `update marketing.companies
       set total_campaigns = greatest(coalesce(total_campaigns,0) + $2, 0),
           total_investment = greatest(coalesce(total_investment,0) + $3, 0)
       where id = $1
       returning id`,
      [companyId, deltaCampaigns, deltaBudget]
    )

    if (!updated) return res.status(404).json({ error: "Company not found" })
    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

adminCompaniesRouter.delete("/:companyId", async (req, res) => {
  try {
    await requireAdmin(req)
    const { companyId } = req.params

    const link = await queryOne(
      `select firebase_uid from marketing.company_users where company_id = $1`,
      [companyId]
    )

    await query(`delete from marketing.company_users where company_id = $1`, [companyId])
    const deleted = await queryOne(`delete from marketing.companies where id = $1 returning id`, [companyId])

    if (!deleted) return res.status(404).json({ error: "Company not found" })

    if (link?.firebase_uid) {
      try {
        await admin.auth().deleteUser(link.firebase_uid)
      } catch {}
      try {
        await admin.firestore().collection("users").doc(link.firebase_uid).delete()
      } catch {}
    }

    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

adminCompaniesRouter.post("/", async (req, res) => {
  try {
    const adminUser = await requireAdmin(req)

    const { company, user } = req.body as {
      company: { name: string; type: string; size?: string; status?: string; products?: string[] }
      user: { email: string; password: string; nombre: string; cedula?: string }
    }

    if (!company?.name || !company?.type || !user?.email || !user?.password || !user?.nombre) {
      return res.status(400).json({ error: "Missing fields" })
    }
    if (user.password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 chars" })
    }

    const companyId = crypto.randomUUID()
    const email = user.email.toLowerCase().trim()

    await query(
      `insert into marketing.companies(id, name, type, size, status, products, total_campaigns, total_investment)
       values ($1,$2,$3,$4,$5,$6::jsonb,0,0)`,
      [
        companyId,
        company.name,
        company.type,
        company.size ?? null,
        company.status ?? "activa",
        JSON.stringify(company.products ?? []),
      ]
    )

    const userRecord = await admin.auth().createUser({
      email,
      password: user.password,
      displayName: user.nombre,
      disabled: false,
    })

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: "company",
      companyId,
    })

    await admin.firestore().collection("users").doc(userRecord.uid).set(
      {
        nombre: user.nombre,
        correo: email,
        cedula: user.cedula ?? null,
        role: "company",
        companyId,
        empresaActualId: companyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: adminUser.uid,
      },
      { merge: true }
    )

    await query(
      `insert into marketing.company_users(firebase_uid, company_id, email)
       values ($1,$2,$3)`,
      [userRecord.uid, companyId, email]
    )

    return res.json({ ok: true, companyId, uid: userRecord.uid })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})
