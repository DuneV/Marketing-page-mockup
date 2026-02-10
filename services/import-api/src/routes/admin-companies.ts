// services/import-api/src/routes/admin-companies.ts
import { Router } from "express"
import crypto from "crypto"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { query, queryOne } from "../lib/db.js"
import { admin } from "../lib/firebaseAdmin.js"

// EVITA el error de types de `uuid` en Cloud Build:
// usa crypto.randomUUID() para crear IDs, y valida UUID sin depender del paquete.
function isUuid(v: any): boolean {
  if (typeof v !== "string") return false
  const s = v.trim()
  if (!s || s === "undefined" || s === "null") return false
  // UUID v1-v5
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

export const adminCompaniesRouter = Router()

// --------------------------
// helpers
// --------------------------
function isEmail(v: any) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function cleanStr(v: any) {
  return typeof v === "string" ? v.trim() : v
}

function assertUuidParam(res: any, companyId: string) {
  if (!isUuid(companyId)) {
    res.status(400).json({ error: "INVALID_COMPANY_ID", companyId })
    return false
  }
  return true
}

/**
 * Trae TODOS los usuarios ligados a una empresa desde SQL y complementa con Firestore.
 * (SQL es el directorio. Firestore es el perfil).
 */
async function getCompanyUsers(companyId: string) {
  const links = await query(
    `select firebase_uid as uid,
            email,
            role_in_company as "companyRole",
            area_id as "areaId",
            status,
            created_at as "createdAt"
     from marketing.company_users
     where company_id = $1
     order by created_at desc`,
    [companyId]
  )

  const users = await Promise.all(
    (links ?? []).map(async (l: any) => {
      try {
        const doc = await admin.firestore().collection("users").doc(l.uid).get()
        const data = doc.exists ? (doc.data() as any) : null

        return {
          uid: l.uid,
          email: l.email ?? data?.correo ?? null,
          nombre: data?.nombre ?? null,
          cedula: data?.cedula ?? null,
          companyRole: l.companyRole ?? data?.companyRole ?? "member",
          areaId: l.areaId ?? data?.areaId ?? null,
          status: l.status ?? "active",
          createdAt: l.createdAt ?? null,
        }
      } catch {
        return {
          uid: l.uid,
          email: l.email ?? null,
          nombre: null,
          cedula: null,
          companyRole: l.companyRole ?? "member",
          areaId: l.areaId ?? null,
          status: l.status ?? "active",
          createdAt: l.createdAt ?? null,
        }
      }
    })
  )

  return users
}

/**
 * Obtiene el "owner" ligado a la empresa (si existe).
 * Se usa para operaciones "legacy" del admin que asumen un usuario principal.
 */
async function getCompanyOwnerLink(companyId: string) {
  // si tu tabla no tiene role_in_company, cambia esta query a "limit 1"
  return queryOne(
    `select firebase_uid, email
     from marketing.company_users
     where company_id = $1
       and role_in_company = 'owner'
     limit 1`,
    [companyId]
  ) as Promise<{ firebase_uid: string; email: string } | null>
}

// --------------------------
// routes
// --------------------------

adminCompaniesRouter.get("/", async (req, res) => {
  try {
    await requireAdmin(req)

    const rows = await query(
      `select id, name, type, size, status, products, nit,
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

/**
 * Devuelve detalle de empresa + LISTA de usuarios
 */
adminCompaniesRouter.get("/:companyId", async (req, res) => {
  try {
    await requireAdmin(req)
    const { companyId } = req.params
    if (!assertUuidParam(res, companyId)) return

    const company = await queryOne(
      `select id, name, type, size, status, products, nit,
              coalesce(total_campaigns,0) as "totalCampañas",
              coalesce(total_investment,0) as "inversionTotal",
              created_at as "fechaCreacion"
       from marketing.companies
       where id = $1`,
      [companyId]
    )

    if (!company) return res.status(404).json({ error: "Company not found" })

    const users = await getCompanyUsers(companyId)

    // compatibilidad: "user" = owner (si tu front todavía lo muestra)
    const owner = users.find((u: any) => u.companyRole === "owner") ?? (users[0] ?? null)

    return res.json({ company, users, user: owner })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

adminCompaniesRouter.patch("/:companyId/campaign-stats", async (req, res) => {
  try {
    await requireAdmin(req)
    const { companyId } = req.params
    if (!assertUuidParam(res, companyId)) return

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

/**
 * Elimina empresa:
 * 1) Borra los users de SQL (cascade si configuraste FK)
 * 2) Borra empresa SQL
 * 3) Borra TODOS los users ligados en Firebase Auth + Firestore
 */
adminCompaniesRouter.delete("/:companyId", async (req, res) => {
  try {
    await requireAdmin(req)
    const { companyId } = req.params
    if (!assertUuidParam(res, companyId)) return

    // 1) saca lista de uids (antes de borrar tabla)
    const links = await query(
      `select firebase_uid as uid
       from marketing.company_users
       where company_id = $1`,
      [companyId]
    )
    const uids = (links ?? []).map((r: any) => r.uid).filter(Boolean)

    // 2) borra links SQL + company SQL
    await query(`delete from marketing.company_users where company_id = $1`, [companyId])
    const deleted = await queryOne(`delete from marketing.companies where id = $1 returning id`, [companyId])

    if (!deleted) return res.status(404).json({ error: "Company not found" })

    // 3) borra en Firebase
    for (const uid of uids) {
      try {
        await admin.auth().deleteUser(uid)
      } catch {}
      try {
        await admin.firestore().collection("users").doc(uid).delete()
      } catch {}
    }

    return res.json({ ok: true, deletedUsers: uids.length })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

/**
 * Crea empresa + crea el usuario "owner" y lo liga en company_users
 */
adminCompaniesRouter.post("/", async (req, res) => {
  try {
    const adminUser = await requireAdmin(req)

    const { company, user } = req.body as {
      company: { name: string; type: string; size?: string; status?: string; products?: string[]; nit?: string | null }
      user: { email: string; password: string; nombre: string; cedula?: string }
    }

    if (!company?.name || !company?.type || !user?.email || !user?.password || !user?.nombre) {
      return res.status(400).json({ error: "Missing fields" })
    }
    if (!isEmail(user.email)) {
      return res.status(400).json({ error: "INVALID_EMAIL" })
    }
    if (user.password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 chars" })
    }

    const companyId = crypto.randomUUID()
    const email = user.email.toLowerCase().trim()
    const nit = typeof company.nit === "string" ? company.nit.trim() : null

    await query(
      `insert into marketing.companies(id, name, type, size, status, products, nit, total_campaigns, total_investment)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,0,0)`,
      [
        companyId,
        company.name,
        company.type,
        company.size ?? null,
        company.status ?? "activa",
        JSON.stringify(company.products ?? []),
        nit,
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
      companyRole: "owner",
      areaId: null,
    })

    await admin.firestore().collection("users").doc(userRecord.uid).set(
      {
        nombre: user.nombre,
        correo: email,
        cedula: user.cedula ?? null,
        role: "company",
        companyId,
        companyRole: "owner",
        areaId: null,
        empresaActualId: companyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: adminUser.uid,
      },
      { merge: true }
    )

    await query(
      `insert into marketing.company_users(firebase_uid, company_id, email, role_in_company, area_id)
       values ($1,$2,$3,$4,$5)`,
      [userRecord.uid, companyId, email, "owner", null]
    )

    return res.json({ ok: true, companyId, uid: userRecord.uid })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

/**
 * PATCH /admin/companies/:companyId
 *
 * Body soportado:
 * {
 *   // empresa (SQL)
 *   name?, type?, size?, status?, products?, nit?
 *
 *   // usuario ligado (firebase + firestore)
 *   user?: { uid?: string, nombre?, email?, cedula?, password? }
 * }
 *
 * NOTA: este endpoint actualiza el usuario "principal" (owner) si no mandas uid.
 */
adminCompaniesRouter.patch("/:companyId", async (req, res) => {
  try {
    await requireAdmin(req)
    const { companyId } = req.params
    if (!assertUuidParam(res, companyId)) return

    const { name, type, size, status, products, nit, user } = req.body ?? {}

    // -----------------------------
    // Validaciones SQL empresa
    // -----------------------------
    if (status !== undefined && !["activa", "inactiva"].includes(String(status))) {
      return res.status(400).json({ error: "INVALID_STATUS" })
    }

    if (products !== undefined) {
      if (!Array.isArray(products)) return res.status(400).json({ error: "INVALID_PRODUCTS" })
      if (products.some((p: any) => typeof p !== "string")) return res.status(400).json({ error: "INVALID_PRODUCTS" })
    }

    if (nit !== undefined && nit !== null && typeof nit !== "string") {
      return res.status(400).json({ error: "INVALID_NIT" })
    }

    // -----------------------------
    // Validaciones User (Firebase)
    // -----------------------------
    const userPatch = user ?? undefined
    if (userPatch !== undefined && typeof userPatch !== "object") {
      return res.status(400).json({ error: "INVALID_USER_PATCH" })
    }

    const nextEmail = typeof userPatch?.email === "string" ? userPatch.email.trim().toLowerCase() : undefined
    const nextNombre = typeof userPatch?.nombre === "string" ? userPatch.nombre.trim() : undefined
    const nextCedula = typeof userPatch?.cedula === "string" ? userPatch.cedula.trim() : undefined
    const nextPassword = typeof userPatch?.password === "string" ? userPatch.password.trim() : undefined

    if (nextEmail !== undefined && !isEmail(nextEmail)) {
      return res.status(400).json({ error: "INVALID_EMAIL" })
    }
    if (nextPassword && nextPassword.length < 8) {
      return res.status(400).json({ error: "PASSWORD_TOO_SHORT" })
    }

    // Si viene userPatch, debe existir usuario ligado (uid),
    // o lo resolvemos al owner de la empresa.
    let firebaseUid: string | null =
      typeof userPatch?.uid === "string" && userPatch.uid.trim() && userPatch.uid.trim() !== "undefined" && userPatch.uid.trim() !== "null"
        ? userPatch.uid.trim()
        : null

    if (userPatch) {
      if (!firebaseUid) {
        const owner = await getCompanyOwnerLink(companyId)
        firebaseUid = owner?.firebase_uid ?? null
      }

      if (!firebaseUid) {
        return res.status(400).json({ error: "NO_LINKED_USER" })
      }
    }

    // -----------------------------
    // 1) UPDATE SQL: companies
    // -----------------------------
    const sets: string[] = []
    const vals: any[] = [companyId]
    let i = 2

    const add = (sql: string, v: any) => {
      sets.push(sql.replace("$X", `$${i}`))
      vals.push(v)
      i++
    }

    if (name !== undefined) add(`name = $X`, cleanStr(name))
    if (type !== undefined) add(`type = $X`, cleanStr(type))
    if (size !== undefined) add(`size = $X`, cleanStr(size))
    if (status !== undefined) add(`status = $X`, cleanStr(status))
    if (products !== undefined) add(`products = $X::jsonb`, JSON.stringify(products))
    if (nit !== undefined) add(`nit = $X`, nit === null ? null : cleanStr(nit))

    let updatedCompanyRow: any | null = null
    if (sets.length > 0) {
      updatedCompanyRow = await queryOne(
        `update marketing.companies
         set ${sets.join(", ")}
         where id = $1
         returning id, name, type, size, status, products, nit,
                   coalesce(total_campaigns,0) as "totalCampañas",
                   coalesce(total_investment,0) as "inversionTotal",
                   created_at as "fechaCreacion"`,
        vals
      )
      if (!updatedCompanyRow) return res.status(404).json({ error: "Company not found" })
    } else {
      const exists = await queryOne(`select id from marketing.companies where id = $1`, [companyId])
      if (!exists) return res.status(404).json({ error: "Company not found" })

      updatedCompanyRow = await queryOne(
        `select id, name, type, size, status, products, nit,
                coalesce(total_campaigns,0) as "totalCampañas",
                coalesce(total_investment,0) as "inversionTotal",
                created_at as "fechaCreacion"
         from marketing.companies
         where id = $1`,
        [companyId]
      )
    }

    // Si cambias email del usuario, también actualiza el email en company_users solo para ese uid
    if (userPatch && nextEmail && firebaseUid) {
      await query(
        `update marketing.company_users
         set email = $3
         where company_id = $1 and firebase_uid = $2`,
        [companyId, firebaseUid, nextEmail]
      )
    }

    // -----------------------------
    // 2) UPDATE Firebase Auth + Firestore (si userPatch)
    // -----------------------------
    if (userPatch && firebaseUid) {
      const authUpdate: Record<string, any> = {}
      if (nextEmail) authUpdate.email = nextEmail
      if (nextPassword) authUpdate.password = nextPassword
      if (nextNombre) authUpdate.displayName = nextNombre

      if (Object.keys(authUpdate).length > 0) {
        try {
          await admin.auth().updateUser(firebaseUid, authUpdate)
        } catch (e: any) {
          return res.status(400).json({
            error: "FIREBASE_AUTH_UPDATE_FAILED",
            message: e?.message ?? String(e),
          })
        }
      }

      const fsPatch: Record<string, any> = {}
      if (nextNombre !== undefined) fsPatch.nombre = nextNombre
      if (nextEmail !== undefined) fsPatch.correo = nextEmail
      if (nextCedula !== undefined) fsPatch.cedula = nextCedula

      if (Object.keys(fsPatch).length > 0) {
        try {
          await admin.firestore().collection("users").doc(firebaseUid).set(fsPatch, { merge: true })
        } catch (e: any) {
          return res.status(400).json({
            error: "FIRESTORE_UPDATE_FAILED",
            message: e?.message ?? String(e),
          })
        }
      }
    }

    return res.json({
      ok: true,
      company: updatedCompanyRow,
      user: userPatch
        ? {
            uid: firebaseUid,
            email: nextEmail ?? undefined,
            nombre: nextNombre ?? undefined,
            cedula: nextCedula ?? undefined,
          }
        : undefined,
    })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})