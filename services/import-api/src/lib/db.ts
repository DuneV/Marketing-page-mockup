import pg from "pg"
import type { QueryResultRow } from "pg"

const { Pool } = pg

export const pool = new Pool({ /* ... */ })

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
