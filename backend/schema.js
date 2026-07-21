const { Pool } = require('pg');
require('dotenv').config();
const { databaseUrl } = require('./config/security');

const pool = new Pool({ connectionString: databaseUrl() });

async function verifySchema() {
  const required = ['users', 'wardrobe_items', 'outfits', 'wear_logs', 'packing_lists', 'ai_analyses', 'wardrobe_recommendations'];
  const result = await pool.query('SELECT name, to_regclass(name) AS relation FROM unnest($1::text[]) AS required(name)', [required.map((name) => `public.${name}`)]);
  const missing = result.rows.filter((row) => row.relation === null).map((row) => row.name);
  if (missing.length) throw new Error(`database migrations are required; missing tables: ${missing.join(', ')}`);
}

module.exports = { pool, verifySchema };
