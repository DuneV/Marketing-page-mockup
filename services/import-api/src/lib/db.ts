import pg from "pg"
import type { QueryResultRow } from "pg"
const { Pool } = pg

const hasCloudSql = !!process.env.INSTANCE_CONNECTION_NAME

export const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: hasCloudSql
    ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
    : (process.env.DB_HOST ?? "127.0.0.1"),
  port: hasCloudSql ? undefined : Number(process.env.DB_PORT ?? "5432"),
  ssl: hasCloudSql ? undefined : { rejectUnauthorized: false },
})

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: any[] = []
): Promise<T[]> {
  const res = await pool.query<T>(text, params)
  return res.rows
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}
