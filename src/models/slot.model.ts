import { pool } from '../config/db';

export interface SlotRow {
  id: string;
  subject: string;
  created_at: Date;
}

export async function getOrCreateSlot(subject: string): Promise<SlotRow> {
  const normalized = subject.toLowerCase().trim();

  const existing = await pool.query<SlotRow>(
    `SELECT * FROM content_slots WHERE subject = $1 LIMIT 1`,
    [normalized],
  );
  if (existing.rows[0]) return existing.rows[0];

  const { rows } = await pool.query<SlotRow>(
    `INSERT INTO content_slots (subject) VALUES ($1)
     ON CONFLICT (subject) DO UPDATE SET subject = EXCLUDED.subject
     RETURNING *`,
    [normalized],
  );
  return rows[0]!;
}

export async function listSlots(): Promise<SlotRow[]> {
  const { rows } = await pool.query<SlotRow>(`SELECT * FROM content_slots ORDER BY subject ASC`);
  return rows;
}
