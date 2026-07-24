const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { databaseUrl } = require('./config/security');

const pool = new Pool({ connectionString: databaseUrl() });

async function verifySchema() {
  const required = ['users', 'wardrobe_items', 'outfits', 'wear_logs', 'packing_lists', 'ai_analyses', 'wardrobe_recommendations'];
  const result = await pool.query('SELECT name, to_regclass(name) AS relation FROM unnest($1::text[]) AS required(name)', [required.map((name) => `public.${name}`)]);
  const missing = result.rows.filter((row) => row.relation === null).map((row) => row.name);
  if (missing.length) throw new Error(`database migrations are required; missing tables: ${missing.join(', ')}`);
}

async function bootstrapRuntime() {
  if (String(process.env.MIGRATE_ON_START).toLowerCase() !== 'true') return;

  const migrationsDir = path.join(__dirname, 'migrations');
  for (const filename of fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
    await pool.query(fs.readFileSync(path.join(migrationsDir, filename), 'utf8'));
  }

  const email = process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const name = process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator';
  if (!email || !password) throw new Error('runtime admin credentials are required');
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'owner')
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role`,
    [email, passwordHash, name]
  );
}

module.exports = { pool, verifySchema, bootstrapRuntime };
