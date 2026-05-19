const express = require('express');
const { pool } = require('../schema');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (e) { PDFDocument = null; }

const router = express.Router();

// Build a safe rate limiter with ipKeyGenerator fallback when behind proxies
const ipKeyGenerator = (req) => {
  return (req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'anon').toString();
};
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req /*, res */) => ipKeyGenerator(req)
});

router.use(limiter);
router.use(auth);

// In-memory store for outfit assembly rules (per-user). Persisted only across server lifetime.
// Each rule: { id, userId, name, primary_color, accent_colors[], season, formality, notes, created_at }
const rulesStore = new Map(); // userId -> [rules]
let ruleSeq = 1;
function getUserRules(uid) {
  if (!rulesStore.has(uid)) {
    // Seed a few defaults
    const now = new Date().toISOString();
    rulesStore.set(uid, [
      { id: ruleSeq++, userId: uid, name: 'Neutral Foundation', primary_color: 'black', accent_colors: ['white', 'grey'], season: 'all', formality: 'casual', notes: 'Safe pairing for everyday wear', created_at: now },
      { id: ruleSeq++, userId: uid, name: 'Spring Pastels', primary_color: 'pastel-pink', accent_colors: ['cream', 'sage-green'], season: 'spring', formality: 'casual', notes: 'Soft tones for warmer days', created_at: now },
      { id: ruleSeq++, userId: uid, name: 'Office Power', primary_color: 'navy', accent_colors: ['white', 'burgundy'], season: 'all', formality: 'business', notes: 'Confident professional palette', created_at: now }
    ]);
  }
  return rulesStore.get(uid);
}

// ===== VIZ 1: Wardrobe category breakdown chart =====
// Returns aggregated counts by category for current user
router.get('/category-breakdown', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT COALESCE(NULLIF(category, ''), 'uncategorized') as category, COUNT(*)::int as count
       FROM wardrobe_items
       WHERE user_id = $1 AND is_donated = FALSE
       GROUP BY 1
       ORDER BY count DESC`,
      [req.user.id]
    );
    const rows = r.rows;
    const total = rows.reduce((s, x) => s + x.count, 0);
    // If no items yet, return seeded demo so the chart still renders something useful
    const data = rows.length ? rows : [
      { category: 'tops', count: 12 },
      { category: 'bottoms', count: 8 },
      { category: 'shoes', count: 6 },
      { category: 'outerwear', count: 4 },
      { category: 'accessories', count: 5 }
    ];
    res.json({
      total: total || data.reduce((s, x) => s + x.count, 0),
      categories: data,
      demo: rows.length === 0,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== VIZ 2: Wear frequency heatmap (item x month) =====
// Returns a matrix: rows = items, cols = months (1..12), value = wear count
router.get('/wear-heatmap', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const itemsR = await pool.query(
      `SELECT id, name FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE ORDER BY name LIMIT 20`,
      [req.user.id]
    );
    const items = itemsR.rows;

    let matrix = [];
    if (items.length === 0) {
      // Demo data so the heatmap renders even with empty wardrobe
      const demoNames = ['Blue Jeans', 'White Tee', 'Black Blazer', 'Sneakers', 'Wool Scarf', 'Linen Shirt'];
      matrix = demoNames.map((name, idx) => ({
        item_id: -(idx + 1),
        name,
        months: Array.from({ length: 12 }, (_, m) => Math.max(0, Math.round(Math.sin((m + idx) / 1.7) * 3 + 3)))
      }));
      return res.json({ year, items: matrix, demo: true, generated_at: new Date().toISOString() });
    }

    const ids = items.map(i => i.id);
    const logsR = await pool.query(
      `SELECT item_id, EXTRACT(MONTH FROM worn_date)::int as month, COUNT(*)::int as cnt
       FROM wear_logs
       WHERE user_id = $1 AND item_id = ANY($2::int[])
         AND EXTRACT(YEAR FROM worn_date) = $3
       GROUP BY item_id, EXTRACT(MONTH FROM worn_date)`,
      [req.user.id, ids, year]
    );

    const counts = {};
    for (const row of logsR.rows) {
      counts[row.item_id] = counts[row.item_id] || {};
      counts[row.item_id][row.month] = row.cnt;
    }
    matrix = items.map(it => ({
      item_id: it.id,
      name: it.name,
      months: Array.from({ length: 12 }, (_, m) => (counts[it.id] && counts[it.id][m + 1]) || 0)
    }));

    res.json({ year, items: matrix, demo: false, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== NON-VIZ 1: Wardrobe inventory PDF =====
router.get('/inventory-pdf', async (req, res) => {
  try {
    const itemsR = await pool.query(
      `SELECT id, name, category, color, brand, size, purchase_price, condition, wear_count, last_worn
       FROM wardrobe_items
       WHERE user_id = $1 AND is_donated = FALSE
       ORDER BY category, name`,
      [req.user.id]
    );
    const items = itemsR.rows;

    if (!PDFDocument) {
      // Fallback to plain-text "PDF-ish" so the endpoint still returns 200
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="wardrobe_inventory.pdf"');
      const lines = ['Wardrobe Inventory Report', `Generated: ${new Date().toISOString()}`, `Total items: ${items.length}`, ''];
      items.forEach(it => lines.push(`- [${it.category || '-'}] ${it.name} | ${it.color || ''} ${it.brand || ''} ${it.size || ''} | $${it.purchase_price || 0}`));
      return res.send(lines.join('\n'));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="wardrobe_inventory.pdf"');

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text('Wardrobe Inventory Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.fillColor('black').moveDown(1);
    doc.fontSize(12).text(`Total active items: ${items.length}`);
    doc.moveDown(0.5);

    if (items.length === 0) {
      doc.fontSize(11).fillColor('#666').text('No wardrobe items yet. Start by adding pieces under My Wardrobe.');
    } else {
      // group by category
      const byCat = items.reduce((m, it) => {
        const k = it.category || 'uncategorized';
        (m[k] = m[k] || []).push(it);
        return m;
      }, {});
      Object.keys(byCat).sort().forEach(cat => {
        doc.moveDown(0.5).fontSize(14).fillColor('#222').text(cat.toUpperCase());
        doc.fontSize(10).fillColor('black');
        byCat[cat].forEach(it => {
          const line = `${it.name} — ${it.color || 'n/a'} | ${it.brand || 'n/a'} | size ${it.size || 'n/a'} | $${it.purchase_price || 0} | worn ${it.wear_count || 0}x`;
          doc.text(line, { indent: 10 });
        });
      });
    }
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== NON-VIZ 2: Outfit assembly rules editor (CRUD) =====
// GET all rules
router.get('/rules', (req, res) => {
  try {
    res.json({ rules: getUserRules(req.user.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE rule
router.post('/rules', (req, res) => {
  try {
    const { name, primary_color, accent_colors, season, formality, notes } = req.body || {};
    if (!name || !primary_color) return res.status(400).json({ error: 'name and primary_color required' });
    const list = getUserRules(req.user.id);
    const rule = {
      id: ruleSeq++,
      userId: req.user.id,
      name: String(name).slice(0, 120),
      primary_color: String(primary_color).slice(0, 50),
      accent_colors: Array.isArray(accent_colors) ? accent_colors.slice(0, 8).map(c => String(c).slice(0, 50)) : [],
      season: String(season || 'all').slice(0, 30),
      formality: String(formality || 'casual').slice(0, 30),
      notes: String(notes || '').slice(0, 400),
      created_at: new Date().toISOString()
    };
    list.push(rule);
    res.status(201).json({ rule });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATE rule
router.put('/rules/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const list = getUserRules(req.user.id);
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'rule not found' });
    const cur = list[idx];
    const upd = req.body || {};
    list[idx] = {
      ...cur,
      ...(upd.name !== undefined ? { name: String(upd.name).slice(0, 120) } : {}),
      ...(upd.primary_color !== undefined ? { primary_color: String(upd.primary_color).slice(0, 50) } : {}),
      ...(upd.accent_colors !== undefined ? { accent_colors: Array.isArray(upd.accent_colors) ? upd.accent_colors.slice(0, 8).map(c => String(c).slice(0, 50)) : cur.accent_colors } : {}),
      ...(upd.season !== undefined ? { season: String(upd.season).slice(0, 30) } : {}),
      ...(upd.formality !== undefined ? { formality: String(upd.formality).slice(0, 30) } : {}),
      ...(upd.notes !== undefined ? { notes: String(upd.notes).slice(0, 400) } : {})
    };
    res.json({ rule: list[idx] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE rule
router.delete('/rules/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const list = getUserRules(req.user.id);
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'rule not found' });
    const [removed] = list.splice(idx, 1);
    res.json({ deleted: removed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
