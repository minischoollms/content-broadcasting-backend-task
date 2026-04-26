import { pool, closePool } from '../config/db';
import { hashPassword } from '../utils/password';

async function seed() {
  const principal = {
    name: 'Default Principal',
    email: 'principal@example.com',
    password: 'Principal@123',
  };
  const teachers = [
    { name: 'Maths Teacher', email: 'maths@example.com', password: 'Teacher@123' },
    { name: 'Science Teacher', email: 'science@example.com', password: 'Teacher@123' },
  ];

  console.log('[seed] inserting principal + teachers...');

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'principal')
     ON CONFLICT (email) DO NOTHING`,
    [principal.name, principal.email, await hashPassword(principal.password)],
  );

  for (const t of teachers) {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'teacher')
       ON CONFLICT (email) DO NOTHING`,
      [t.name, t.email, await hashPassword(t.password)],
    );
  }

  for (const subject of ['maths', 'science', 'english']) {
    await pool.query(
      `INSERT INTO content_slots (subject) VALUES ($1)
       ON CONFLICT (subject) DO NOTHING`,
      [subject],
    );
  }

  console.log('[seed] done. Default credentials:');
  console.log(`  principal -> ${principal.email} / ${principal.password}`);
  for (const t of teachers) console.log(`  teacher   -> ${t.email} / ${t.password}`);
}

seed()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
