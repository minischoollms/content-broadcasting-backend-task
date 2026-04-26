import { pool } from '../config/db';

export async function recordView(params: {
  contentId: string;
  teacherId: string;
  subject: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO content_views (content_id, teacher_id, subject)
     VALUES ($1, $2, LOWER($3))`,
    [params.contentId, params.teacherId, params.subject],
  );
}

export interface SubjectStat {
  subject: string;
  total_views: number;
  unique_content: number;
}

export async function topSubjects(limit = 10): Promise<SubjectStat[]> {
  const { rows } = await pool.query<{
    subject: string;
    total_views: string;
    unique_content: string;
  }>(
    `SELECT subject,
            COUNT(*)::text                  AS total_views,
            COUNT(DISTINCT content_id)::text AS unique_content
     FROM content_views
     GROUP BY subject
     ORDER BY COUNT(*) DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    subject: r.subject,
    total_views: parseInt(r.total_views, 10),
    unique_content: parseInt(r.unique_content, 10),
  }));
}

export interface ContentStat {
  content_id: string;
  title: string;
  subject: string;
  total_views: number;
}

export async function topContent(limit = 10): Promise<ContentStat[]> {
  const { rows } = await pool.query<{
    content_id: string;
    title: string;
    subject: string;
    total_views: string;
  }>(
    `SELECT v.content_id,
            c.title,
            v.subject,
            COUNT(*)::text AS total_views
     FROM content_views v
     JOIN content c ON c.id = v.content_id
     GROUP BY v.content_id, c.title, v.subject
     ORDER BY COUNT(*) DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    content_id: r.content_id,
    title: r.title,
    subject: r.subject,
    total_views: parseInt(r.total_views, 10),
  }));
}
