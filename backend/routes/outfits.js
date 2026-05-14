const express = require('express');
const { pool } = require('../schema');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// GET all outfits
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const result = await pool.query(
      'SELECT * FROM outfits WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM outfits WHERE user_id = $1', [req.user.id]);
    res.json({ outfits: result.rows, total: parseInt(countResult.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single outfit
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM outfits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Outfit not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create outfit
router.post('/', async (req, res) => {
  try {
    const { name, occasion, season, item_ids, image_url, ai_rating, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await pool.query(
      'INSERT INTO outfits (user_id, name, occasion, season, item_ids, image_url, ai_rating, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.user.id, name, occasion, season, item_ids || [], image_url, ai_rating, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update outfit
router.put('/:id', async (req, res) => {
  try {
    const { name, occasion, season, item_ids, image_url, ai_rating, notes, wear_count, last_worn } = req.body;
    const existing = await pool.query('SELECT * FROM outfits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Outfit not found' });
    const result = await pool.query(`
      UPDATE outfits SET name=COALESCE($1,name), occasion=COALESCE($2,occasion), season=COALESCE($3,season),
        item_ids=COALESCE($4,item_ids), image_url=COALESCE($5,image_url), ai_rating=COALESCE($6,ai_rating),
        notes=COALESCE($7,notes), wear_count=COALESCE($8,wear_count), last_worn=COALESCE($9,last_worn)
      WHERE id=$10 AND user_id=$11 RETURNING *`,
      [name, occasion, season, item_ids, image_url, ai_rating, notes, wear_count, last_worn, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE outfit
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM outfits WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Outfit not found' });
    res.json({ message: 'Outfit deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST log outfit wear
router.post('/:id/wear', async (req, res) => {
  try {
    const { occasion, weather, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];
    await pool.query(
      'UPDATE outfits SET wear_count = wear_count + 1, last_worn = $1 WHERE id = $2 AND user_id = $3',
      [today, req.params.id, req.user.id]
    );
    await pool.query(
      'INSERT INTO wear_logs (user_id, outfit_id, worn_date, occasion, weather, notes) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.id, req.params.id, today, occasion, weather, notes]
    );
    res.json({ message: 'Outfit wear logged' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
