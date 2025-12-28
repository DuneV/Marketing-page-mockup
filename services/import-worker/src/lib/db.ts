import pg from "pg"
const { Pool } = pg

export const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.INSTANCE_CONNECTION_NAME
    ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
    : process.env.DB_HOST,
  port: process.env.INSTANCE_CONNECTION_NAME ? undefined : Number(process.env.DB_PORT ?? "5432"),
  ssl: { rejectUnauthorized: false },
})

export async function query(text: string, params: any[] = []) {
  const res = await pool.query(text, params)
  return res.rows
}

export async function queryOne(text: string, params: any[] = []) {
  const rows = await query(text, params)
  return rows[0] ?? null
}
