// services/import-worker/src/intex.ts

import express from "express"
import { processImport } from "./lib/parse.js"
import { query } from "./lib/db.js"

const app = express()
app.use(express.json({ type: "*/*" }))

app.get("/health", (_req, res) => res.json({ ok: true }))

app.post("/pubsub/import", async (req, res) => {
  try {
    const dataB64 = req.body?.message?.data
    const decoded = dataB64
      ? JSON.parse(Buffer.from(dataB64, "base64").toString("utf8"))
      : null

    const importId = decoded?.importId
    if (!importId) return res.status(400).send("missing importId")

    await query(`update imports set status='PROCESSING', updated_at=now() where id=$1`, [importId])
    await processImport(importId)

    res.status(204).send("")
  } catch (e) {
    console.error(e)
    res.status(500).send("error")
  }
})

const port = Number(process.env.PORT ?? "8080")
app.listen(port, () => console.log(`import-worker listening on :${port}`))
