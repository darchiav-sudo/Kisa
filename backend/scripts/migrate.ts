import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSql } from '../src/db/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = getSql();
  const schema = readFileSync(join(__dirname, '../src/db/schema.sql'), 'utf8');
  // neon serverless tagged template needs one statement at a time for some drivers;
  // split on semicolons carefully.
  const statements = schema
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    await sql.query(statement);
    console.log('ok:', statement.slice(0, 48).replace(/\s+/g, ' '), '…');
  }
  console.log('Migration complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
