// services/import-api/src/index.ts

import express from "express"
import cors from "cors"
import { importsRouter } from "./routes/imports.js"
import { templatesRouter } from "./routes/templates.js"
import { adminCompaniesRouter } from "./routes/admin-companies.js";
import { campaignsRouter } from "./routes/campaigns.js"
import { adminSchemasRouter } from "./routes/admin-schemas.js"
import { companyUsersRouter } from "./routes/company-users.js"
// import { sheetsRouter } from "./routes/sheets.js"
import { assetsRouter } from "./routes/assets.js"

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? ["*"],
  credentials: true,
}))
app.use(express.json({ limit: "2mb" }))

app.get("/health", (_req, res) => res.json({ ok: true }))
// app.use("/sheets", sheetsRouter)
app.use("/assets", assetsRouter)
app.use("/imports", importsRouter)
app.use("/templates", templatesRouter)
app.use("/admin/companies", adminCompaniesRouter);
app.use("/campaigns", campaignsRouter)
app.use("/admin/schemas", adminSchemasRouter)
app.use("/company/users", companyUsersRouter)
app.get("/debug/firebase", (_req, res) => {
  res.json({
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? null,
  })
})

const port = Number(process.env.PORT ?? "8080")
app.listen(port, () => console.log(`import-api listening on :${port}`))
