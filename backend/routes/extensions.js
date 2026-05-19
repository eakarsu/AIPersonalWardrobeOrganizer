// Apply pass 5 — Backlog implementation for AIPersonalWardrobeOrganizer
//
// Implements remaining backlog items from _AUDIT_NOTE.md (cap 10):
//   1. Size/fit tracking                 (NEEDS-PRODUCT-DECISION) — separate item_fit_records table
//   2. Social sharing                    (NEEDS-PRODUCT-DECISION) — owner-controlled, link-only by default
//   3. Shopping integration              (NEEDS-CREDS)            — 503 missing SHOPPING_API_KEY (+ SHOPPING_PROVIDER)
//   4. Live weather API                  (NEEDS-CREDS)            — 503 missing OPENWEATHER_API_KEY
//   5. Outfit orchestration agent        (NEEDS-PRODUCT-DECISION) — daily plan endpoint, no cron yet
//   6. Computer vision closet audit      (TOO-RISKY)              — in-memory dedup/condition stub
//   7. Travel capsule builder            (TOO-RISKY)              — capsule plan registry endpoint
//   8. Seasonal rotation automation      (TOO-RISKY)              — schedule registry, manual trigger
//
// Env vars consumed by NEEDS-CREDS endpoints (return 503 + missing if unset):
//   SHOPPING_API_KEY, SHOPPING_PROVIDER -> /api/wardrobe-ext/shopping/*
//   OPENWEATHER_API_KEY                 -> /api/wardrobe-ext/weather/forecast
//
// All endpoints reuse middleware/auth and schema's pg pool. Tables created
// idempotently via CREATE TABLE IF NOT EXISTS.

const express = require('express');
const fetch = require('node-fetch');
const { pool } = require('../schema');
const auth = require('../middleware/auth');

const router = express.Router();

async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS item_fit_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        item_id INTEGER,
        size_label VARCHAR(40),
        chest_cm NUMERIC(6,2),
        waist_cm NUMERIC(6,2),
        hip_cm NUMERIC(6,2),
        inseam_cm NUMERIC(6,2),
        sleeve_cm NUMERIC(6,2),
        fit_rating VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS shared_outfits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        outfit_id INTEGER,
        share_token VARCHAR(64) UNIQUE NOT NULL,
        visibility VARCHAR(20) DEFAULT 'link',
        caption TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        revoked_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS shopping_wishlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        category VARCHAR(80),
        target_price NUMERIC(10,2),
        notes TEXT,
        external_match JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS daily_outfit_plans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        plan_for_date DATE,
        plan JSONB,
        weather_summary TEXT,
        calendar_summary TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS closet_audit_runs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        params JSONB,
        result JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS travel_capsules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        destination VARCHAR(255),
        start_date DATE,
        end_date DATE,
        capsule JSONB,
        gaps JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS seasonal_rotation_schedules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        from_season VARCHAR(20),
        to_season VARCHAR(20),
        scheduled_for DATE,
        items_to_store JSONB,
        items_to_pull JSONB,
        executed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.error('ensureTables (extensions) failed (non-fatal):', e.message);
  }
}
ensureTables();

router.use(auth);

// ───────────────────────────────────────────────────────────────────────────
// 1. Size/fit tracking (NEEDS-PRODUCT-DECISION)
// PRODUCT-DECISION: keep fit data in a separate side-table rather than altering
//   wardrobe_items. Avoids destructive schema change and lets users record
//   multiple measurements over time per item.
// ───────────────────────────────────────────────────────────────────────────
router.get('/fit', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM item_fit_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200',
      [req.user.id]
    );
    res.json({ records: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/fit', async (req, res) => {
  try {
    const { item_id, size_label, chest_cm, waist_cm, hip_cm, inseam_cm, sleeve_cm, fit_rating, notes } = req.body;
    const r = await pool.query(
      `INSERT INTO item_fit_records (user_id, item_id, size_label, chest_cm, waist_cm, hip_cm, inseam_cm, sleeve_cm, fit_rating, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, item_id || null, size_label || null, chest_cm || null, waist_cm || null, hip_cm || null, inseam_cm || null, sleeve_cm || null, fit_rating || null, notes || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ───────────────────────────────────────────────────────────────────────────
// 2. Social sharing (NEEDS-PRODUCT-DECISION)
// PRODUCT-DECISION: visibility defaults to 'link' (un-listed link only).
//   Owner can revoke. No public feed, no comments, no follower graph in this
//   pass — those need moderation policy.
// ───────────────────────────────────────────────────────────────────────────
router.post('/share/outfits', async (req, res) => {
  try {
    const { outfit_id, caption, visibility } = req.body;
    const vis = visibility === 'private' ? 'private' : 'link'; // PRODUCT-DECISION: only link/private
    const token = require('crypto').randomBytes(16).toString('hex');
    const r = await pool.query(
      `INSERT INTO shared_outfits (user_id, outfit_id, share_token, visibility, caption)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, outfit_id || null, token, vis, caption || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/share/outfits/mine', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM shared_outfits WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ shares: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/share/outfits/:token', async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE shared_outfits SET revoked_at = NOW() WHERE share_token = $1 AND user_id = $2 RETURNING id',
      [req.params.token, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ revoked: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ───────────────────────────────────────────────────────────────────────────
// 3. Shopping integration (NEEDS-CREDS)
// 503 missing: SHOPPING_API_KEY (+ SHOPPING_PROVIDER for routing)
// ───────────────────────────────────────────────────────────────────────────
function shoppingMissing() {
  const missing = [];
  if (!process.env.SHOPPING_API_KEY) missing.push('SHOPPING_API_KEY');
  if (!process.env.SHOPPING_PROVIDER) missing.push('SHOPPING_PROVIDER');
  return missing;
}

router.post('/shopping/match', async (req, res) => {
  const missing = shoppingMissing();
  if (missing.length) return res.status(503).json({ error: 'Shopping integration unavailable', missing });
  try {
    const { category, target_price, notes } = req.body;
    const r = await pool.query(
      `INSERT INTO shopping_wishlist (user_id, category, target_price, notes, external_match)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, category || null, target_price || null, notes || null, JSON.stringify({ provider: process.env.SHOPPING_PROVIDER, queued_at: new Date().toISOString() })]
    );
    res.status(201).json({ wishlist_item: r.rows[0], note: 'Pass-5 stub: queued; live provider call not invoked.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/shopping/wishlist', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM shopping_wishlist WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [req.user.id]);
    res.json({ wishlist: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ───────────────────────────────────────────────────────────────────────────
// 4. Live weather API integration (NEEDS-CREDS)
// 503 missing: OPENWEATHER_API_KEY
// ───────────────────────────────────────────────────────────────────────────
router.get('/weather/forecast', async (req, res) => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Weather API unavailable', missing: 'OPENWEATHER_API_KEY' });
  try {
    const { city, lat, lon } = req.query;
    let url;
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${apiKey}&units=metric`;
    } else if (city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    } else {
      return res.status(400).json({ error: 'Provide city or lat+lon' });
    }
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'Upstream weather error', detail: data });
    res.json({ provider: 'openweathermap', data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ───────────────────────────────────────────────────────────────────────────
// 5. Outfit orchestration agent (NEEDS-PRODUCT-DECISION)
// PRODUCT-DECISION: synchronous /daily-plan endpoint instead of cron infra.
//   Caller passes weather + calendar + laundry hints; result persists.
// ───────────────────────────────────────────────────────────────────────────
router.post('/orchestrate/daily-plan', async (req, res) => {
  try {
    const { plan_for_date, weather_summary, calendar_summary, laundry_unavailable_item_ids } = req.body;
    const targetDate = plan_for_date || new Date().toISOString().slice(0, 10);
    const itemsRes = await pool.query(
      `SELECT id, name, category, color, season, formality, last_worn FROM wardrobe_items
       WHERE user_id = $1 AND is_donated = FALSE`,
      [req.user.id]
    );
    const blocked = new Set((laundry_unavailable_item_ids || []).map(Number));
    const usable = itemsRes.rows.filter(i => !blocked.has(i.id));
    // PRODUCT-DECISION: rule-based, deterministic-by-date plan; AI may be added later.
    const seed = parseInt(targetDate.replace(/-/g, ''), 10) % 1000003;
    function pick(category) {
      const pool = usable.filter(i => i.category && i.category.toLowerCase().includes(category));
      if (!pool.length) return null;
      return pool[seed % pool.length];
    }
    const plan = {
      date: targetDate,
      top: pick('top') || pick('shirt'),
      bottom: pick('bottom') || pick('pant'),
      outerwear: pick('jacket') || pick('coat'),
      shoes: pick('shoe'),
    };
    const r = await pool.query(
      `INSERT INTO daily_outfit_plans (user_id, plan_for_date, plan, weather_summary, calendar_summary)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, targetDate, JSON.stringify(plan), weather_summary || null, calendar_summary || null]
    );
    res.status(201).json({ plan: r.rows[0], usable_count: usable.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ───────────────────────────────────────────────────────────────────────────
// 6. Computer vision closet audit (TOO-RISKY → in-memory stub)
// Stub: aggregates over wardrobe_items rather than running CV.
// Real CV/dedup deferred — would need image hashing (perceptual) + storage tier.
// ───────────────────────────────────────────────────────────────────────────
router.post('/closet-audit/run', async (req, res) => {
  try {
    const itemsRes = await pool.query(
      'SELECT id, name, category, color, condition, image_url FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE',
      [req.user.id]
    );
    const items = itemsRes.rows;
    const dups = {};
    for (const it of items) {
      const key = `${(it.category || '').toLowerCase()}|${(it.color || '').toLowerCase()}|${(it.name || '').toLowerCase()}`;
      dups[key] = (dups[key] || []);
      dups[key].push(it.id);
    }
    const duplicates = Object.entries(dups).filter(([, ids]) => ids.length > 1).map(([k, ids]) => ({ key: k, item_ids: ids }));
    const condition_buckets = items.reduce((acc, it) => { acc[it.condition || 'unknown'] = (acc[it.condition || 'unknown'] || 0) + 1; return acc; }, {});
    const missing_image = items.filter(i => !i.image_url).length;
    const summary = { item_count: items.length, duplicates, condition_buckets, missing_image, note: 'Pass-5 stub: name+category+color match, not perceptual.' };
    const r = await pool.query(
      `INSERT INTO closet_audit_runs (user_id, params, result) VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, JSON.stringify({}), JSON.stringify(summary)]
    );
    res.status(201).json({ run_id: r.rows[0].id, summary });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ───────────────────────────────────────────────────────────────────────────
// 7. Travel capsule builder (TOO-RISKY → schema-only registry)
// PRODUCT-DECISION: register a capsule plan (item ids + duration). Full UX
//   state machine deferred.
// ───────────────────────────────────────────────────────────────────────────
router.post('/travel-capsule', async (req, res) => {
  try {
    const { destination, start_date, end_date, capsule, gaps } = req.body;
    const r = await pool.query(
      `INSERT INTO travel_capsules (user_id, destination, start_date, end_date, capsule, gaps)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, destination || null, start_date || null, end_date || null, JSON.stringify(capsule || {}), JSON.stringify(gaps || [])]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/travel-capsule', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM travel_capsules WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ capsules: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ───────────────────────────────────────────────────────────────────────────
// 8. Seasonal rotation automation (TOO-RISKY → schedule registry, manual trigger)
// PRODUCT-DECISION: persist a schedule row that user can mark executed; cron
//   integration deferred (no notifications infra).
// ───────────────────────────────────────────────────────────────────────────
router.post('/rotation/schedule', async (req, res) => {
  try {
    const { from_season, to_season, scheduled_for, items_to_store, items_to_pull } = req.body;
    const r = await pool.query(
      `INSERT INTO seasonal_rotation_schedules (user_id, from_season, to_season, scheduled_for, items_to_store, items_to_pull)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, from_season || null, to_season || null, scheduled_for || null, JSON.stringify(items_to_store || []), JSON.stringify(items_to_pull || [])]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rotation/:id/execute', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE seasonal_rotation_schedules SET executed_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ executed: true, schedule: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rotation', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM seasonal_rotation_schedules WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ schedules: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
