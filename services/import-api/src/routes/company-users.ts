// services/import-api/src/routes/company-users.ts
import { Router } from "express"
import { requireCompanyManager } from "../middleware/requireCompanyManager.js"
import { query, queryOne } from "../lib/db.js"
import { admin } from "../lib/firebaseAdmin.js"

function isEmail(v: any) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function cleanStr(v: any) {
  return typeof v === "string" ? v.trim() : v
}

function toRole(v: any): "owner" | "manager" | "member" {
  const s = String(v ?? "").toLowerCase().trim()
  if (s === "owner" || s === "manager" || s === "member") return s
  return "member"
}

// Solo para evitar errores con "undefined"/"null"
function cleanNullableString(v: any): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s || s === "undefined" || s === "null") return null
  return s
}

export const companyUsersRouter = Router()

/**
 * GET /company/users
 * Lista usuarios de la compañía del requester
 */
companyUsersRouter.get("/", async (req, res) => {
  try {
    const ctx = await requireCompanyManager(req)
    const companyId = ctx.companyId

    const rows = await query(
      `select firebase_uid as uid,
              email,
              created_at as "createdAt"
       from marketing.company_users
       where company_id = $1
       order by created_at desc`,
      [companyId]
    )

    // complementa con Firestore
    const users = await Promise.all(
      (rows ?? []).map(async (r: any) => {
        try {
          const doc = await admin.firestore().collection("users").doc(r.uid).get()
          const data = doc.exists ? (doc.data() as any) : null
          return {
            uid: r.uid,
            email: r.email ?? data?.correo ?? null,
            nombre: data?.nombre ?? null,
            cedula: data?.cedula ?? null,
            companyRole: r.companyRole ?? data?.companyRole ?? "member",
            areaId: r.areaId ?? data?.areaId ?? null,
            status: r.status ?? "active",
            createdAt: r.createdAt ?? null,
          }
        } catch {
          return {
            uid: r.uid,
            email: r.email ?? null,
            nombre: null,
            cedula: null,
            companyRole: r.companyRole ?? "member",
            areaId: r.areaId ?? null,
            status: r.status ?? "active",
            createdAt: r.createdAt ?? null,
          }
        }
      })
    )

    return res.json({ ok: true, users })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

/**
 * POST /company/users
 * Crea un usuario (por área) dentro de la compañía:
 * body:
 * {
 *   email, password, nombre, cedula?,
 *   companyRole?: manager|member,
 *   areaId?: string|null
 * }
 */
companyUsersRouter.post("/", async (req, res) => {
  try {
    const ctx = await requireCompanyManager(req)
    const companyId = ctx.companyId

    const emailRaw = req.body?.email
    const passwordRaw = req.body?.password
    const nombreRaw = req.body?.nombre
    const cedulaRaw = req.body?.cedula
    const roleRaw = req.body?.companyRole
    const areaIdRaw = req.body?.areaId

    const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : ""
    const password = typeof passwordRaw === "string" ? passwordRaw : ""
    const nombre = typeof nombreRaw === "string" ? nombreRaw.trim() : ""
    const cedula = cleanNullableString(cedulaRaw)
    const companyRole = toRole(roleRaw)
    const areaId = cleanNullableString(areaIdRaw)

    // Owner/manager pueden crear manager/member (no owner)
    if (companyRole === "owner") {
      return res.status(400).json({ error: "CANNOT_CREATE_OWNER" })
    }

    if (!email || !isEmail(email)) return res.status(400).json({ error: "INVALID_EMAIL" })
    if (!password || password.length < 8) return res.status(400).json({ error: "PASSWORD_TOO_SHORT" })
    if (!nombre) return res.status(400).json({ error: "MISSING_NAME" })

    // Evita duplicados en SQL por email dentro de la compañía
    const existing = await queryOne(
      `select firebase_uid
       from marketing.company_users
       where company_id = $1 and lower(email) = lower($2)
       limit 1`,
      [companyId, email]
    )
    if (existing?.firebase_uid) {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS_IN_COMPANY" })
    }

    // 1) Crea user en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
      disabled: false,
    })

    // 2) Claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: "company",
      companyId,
      companyRole, // manager|member
      areaId: areaId ?? null,
    })

    // 3) Firestore profile (misma fuente que usa tu front)
    await admin.firestore().collection("users").doc(userRecord.uid).set(
      {
        nombre,
        correo: email,
        cedula: cedula ?? null,
        role: "company",
        companyId,
        companyRole,
        areaId: areaId ?? null,
        empresaActualId: companyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: ctx.uid,
      },
      { merge: true }
    )

    // 4) SQL link
    await query(
      `INSERT INTO marketing.company_users(firebase_uid, company_id, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid, company_id) DO NOTHING`,
      [userRecord.uid, companyId, email]
    )

    return res.json({ ok: true, uid: userRecord.uid })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

/**
 * PATCH /company/users/:uid
 * Permite editar:
 * - nombre, email, cedula, password
 * - companyRole (manager|member) (no owner)
 * - areaId
 * - status (active/disabled)
 */
companyUsersRouter.patch("/:uid", async (req, res) => {
  try {
    const ctx = await requireCompanyManager(req)
    const companyId = ctx.companyId
    const uid = String(req.params.uid ?? "").trim()
    if (!uid) return res.status(400).json({ error: "MISSING_UID" })

    // Verifica que ese uid pertenece a esta compañía
    const link = await queryOne(
      `select firebase_uid as uid, email, role_in_company as "companyRole"
       from marketing.company_users
       where company_id = $1 and firebase_uid = $2
       limit 1`,
      [companyId, uid]
    )
    if (!link?.uid) return res.status(404).json({ error: "USER_NOT_IN_COMPANY" })

    // No permitir editar owner por este endpoint (owner se gestiona por admin-companies patch)
    if (String(link.companyRole) === "owner") {
      return res.status(400).json({ error: "CANNOT_EDIT_OWNER_HERE" })
    }

    const nextEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : undefined
    const nextNombre = typeof req.body?.nombre === "string" ? req.body.nombre.trim() : undefined
    const nextCedula = typeof req.body?.cedula === "string" ? req.body.cedula.trim() : undefined
    const nextPassword = typeof req.body?.password === "string" ? req.body.password.trim() : undefined
    const nextCompanyRole = req.body?.companyRole !== undefined ? toRole(req.body.companyRole) : undefined
    const nextAreaId = req.body?.areaId !== undefined ? cleanNullableString(req.body.areaId) : undefined
    const nextStatus = req.body?.status !== undefined ? String(req.body.status).trim().toLowerCase() : undefined

    if (nextEmail !== undefined && !isEmail(nextEmail)) return res.status(400).json({ error: "INVALID_EMAIL" })
    if (nextPassword && nextPassword.length < 8) return res.status(400).json({ error: "PASSWORD_TOO_SHORT" })

    if (nextCompanyRole === "owner") return res.status(400).json({ error: "CANNOT_SET_OWNER" })
    if (nextStatus !== undefined && !["active", "disabled"].includes(nextStatus)) {
      return res.status(400).json({ error: "INVALID_STATUS" })
    }

    // si cambias email, evita colisión dentro de la misma compañía
    if (nextEmail) {
      const existing = await queryOne(
        `select firebase_uid
         from marketing.company_users
         where company_id = $1 and lower(email) = lower($2) and firebase_uid <> $3
         limit 1`,
        [companyId, nextEmail, uid]
      )
      if (existing?.firebase_uid) {
        return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS_IN_COMPANY" })
      }
    }

    // Firebase Auth update
    const authUpdate: Record<string, any> = {}
    if (nextEmail) authUpdate.email = nextEmail
    if (nextPassword) authUpdate.password = nextPassword
    if (nextNombre) authUpdate.displayName = nextNombre
    if (nextStatus) authUpdate.disabled = nextStatus === "disabled"

    if (Object.keys(authUpdate).length > 0) {
      await admin.auth().updateUser(uid, authUpdate)
    }

    // Claims update (si cambian rol/area)
    const claimsPatch: any = {
      role: "company",
      companyId,
    }
    // conserva si no llega
    claimsPatch.companyRole = nextCompanyRole ?? link.companyRole ?? "member"
    claimsPatch.areaId = nextAreaId ?? null

    await admin.auth().setCustomUserClaims(uid, claimsPatch)

    // Firestore update
    const fsPatch: Record<string, any> = {}
    if (nextNombre !== undefined) fsPatch.nombre = nextNombre
    if (nextEmail !== undefined) fsPatch.correo = nextEmail
    if (nextCedula !== undefined) fsPatch.cedula = nextCedula
    if (nextCompanyRole !== undefined) fsPatch.companyRole = nextCompanyRole
    if (nextAreaId !== undefined) fsPatch.areaId = nextAreaId
    if (Object.keys(fsPatch).length > 0) {
      await admin.firestore().collection("users").doc(uid).set(fsPatch, { merge: true })
    }

    // SQL update
    const sets: string[] = []
    const vals: any[] = [companyId, uid]
    let i = 3
    const add = (sql: string, v: any) => {
      sets.push(sql.replace("$X", `$${i}`))
      vals.push(v)
      i++
    }

    if (nextEmail !== undefined) add(`email = $X`, nextEmail)
    if (nextCompanyRole !== undefined) add(`role_in_company = $X`, nextCompanyRole)
    if (nextAreaId !== undefined) add(`area_id = $X`, nextAreaId)
    if (nextStatus !== undefined) add(`status = $X`, nextStatus)

    if (sets.length > 0) {
      await query(
        `update marketing.company_users
         set ${sets.join(", ")}
         where company_id = $1 and firebase_uid = $2`,
        vals
      )
    }

    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

/**
 * DELETE /company/users/:uid
 * Borra un usuario (NO owner)
 */
companyUsersRouter.delete("/:uid", async (req, res) => {
  try {
    const ctx = await requireCompanyManager(req)
    const companyId = ctx.companyId
    const uid = String(req.params.uid ?? "").trim()
    if (!uid) return res.status(400).json({ error: "MISSING_UID" })

    const link = await queryOne(
      `select firebase_uid as uid, role_in_company as "companyRole"
       from marketing.company_users
       where company_id = $1 and firebase_uid = $2
       limit 1`,
      [companyId, uid]
    )

    if (!link?.uid) return res.status(404).json({ error: "USER_NOT_IN_COMPANY" })
    if (String(link.companyRole) === "owner") return res.status(400).json({ error: "CANNOT_DELETE_OWNER" })

    await query(`delete from marketing.company_users where company_id = $1 and firebase_uid = $2`, [companyId, uid])

    try {
      await admin.auth().deleteUser(uid)
    } catch {}
    try {
      await admin.firestore().collection("users").doc(uid).delete()
    } catch {}

    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})