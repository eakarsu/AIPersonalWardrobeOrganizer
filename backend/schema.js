const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      color VARCHAR(100),
      material VARCHAR(100),
      pattern VARCHAR(100),
      season TEXT[],
      formality VARCHAR(100),
      brand VARCHAR(100),
      size VARCHAR(50),
      purchase_price DECIMAL(10,2),
      purchase_date DATE,
      condition VARCHAR(50),
      image_url TEXT,
      auto_tags JSONB,
      wear_count INTEGER DEFAULT 0,
      last_worn DATE,
      is_donated BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS outfits (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      occasion VARCHAR(100),
      season VARCHAR(100),
      item_ids INTEGER[],
      image_url TEXT,
      ai_rating INTEGER,
      notes TEXT,
      wear_count INTEGER DEFAULT 0,
      last_worn DATE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wear_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES wardrobe_items(id) ON DELETE SET NULL,
      outfit_id INTEGER REFERENCES outfits(id) ON DELETE SET NULL,
      worn_date DATE NOT NULL,
      occasion VARCHAR(100),
      weather VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS packing_lists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      destination VARCHAR(255),
      travel_dates JSONB,
      occasion_types TEXT[],
      items JSONB,
      ai_suggestions JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_analyses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint VARCHAR(100),
      item_id INTEGER,
      result JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Schema initialized');
}

module.exports = { pool, initSchema };
