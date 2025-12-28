import express from "express"
import cors from "cors"
import { importsRouter } from "./routes/imports"
import { templatesRouter } from "./routes/templates"

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? ["*"],
  credentials: true
}))
app.use(express.json({ limit: "2mb" }))

app.get("/health", (_req, res) => res.json({ ok: true }))

app.use("/imports", importsRouter)
app.use("/templates", templatesRouter)

const port = Number(process.env.PORT ?? "8080")
app.listen(port, () => console.log(`import-api listening on :${port}`))
