// services/import-api/src/intex.ts

import express from "express"
import cors from "cors"
import { importsRouter } from "./routes/imports.js"
import { templatesRouter } from "./routes/templates.js"

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? ["*"],
  credentials: true
}))
app.use(express.json({ limit: "2mb" }))

app.get("/health", (_req, res) => res.json({ ok: true }))

app.use("/imports", importsRouter)
app.use("/templates", templatesRouter)
app.get("/debug/firebase", (_req, res) => {
  res.json({
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? null,
  })
})

const port = Number(process.env.PORT ?? "8080")
app.listen(port, () => console.log(`import-api listening on :${port}`))
