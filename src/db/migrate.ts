import fs from 'node:fs';
import path from 'node:path';
import { pool, closePool } from '../config/db';

async function run() {
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('[migrate] applying schema.sql ...');
  await pool.query(sql);
  console.log('[migrate] done.');
}

run()
  .catch((err) => {
    console.error('[migrate] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
