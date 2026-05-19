const express = require('express');
const path = require('path');
const multer = require('multer');
const { pool } = require('../schema');
const auth = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(auth);

// GET all items (with pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { category, season, formality } = req.query;

    let query = 'SELECT * FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE';
    const params = [req.user.id];
    let idx = 2;

    if (category) { query += ` AND category = $${idx++}`; params.push(category); }
    if (formality) { query += ` AND formality = $${idx++}`; params.push(formality); }

    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE', [req.user.id]);

    res.json({ items: result.rows, total: parseInt(countResult.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single item
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM wardrobe_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create item with optional photo
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, category, color, material, pattern, season, formality, brand, size,
      purchase_price, purchase_date, condition, auto_tags } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const seasonArr = season ? (Array.isArray(season) ? season : season.split(',').map(s => s.trim())) : null;
    const tagsObj = auto_tags ? (typeof auto_tags === 'string' ? JSON.parse(auto_tags) : auto_tags) : null;

    const result = await pool.query(`
      INSERT INTO wardrobe_items (user_id, name, category, color, material, pattern, season, formality, brand, size,
        purchase_price, purchase_date, condition, image_url, auto_tags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [req.user.id, name, category, color, material, pattern, seasonArr, formality, brand, size,
       purchase_price || null, purchase_date || null, condition, image_url, tagsObj ? JSON.stringify(tagsObj) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update item
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM wardrobe_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const { name, category, color, material, pattern, season, formality, brand, size,
      purchase_price, purchase_date, condition, wear_count, last_worn, is_donated, auto_tags } = req.body;

    const image_url = req.file ? `/uploads/${req.file.filename}` : existing.rows[0].image_url;
    const seasonArr = season ? (Array.isArray(season) ? season : season.split(',').map(s => s.trim())) : existing.rows[0].season;
    const tagsObj = auto_tags ? (typeof auto_tags === 'string' ? JSON.parse(auto_tags) : auto_tags) : existing.rows[0].auto_tags;

    const result = await pool.query(`
      UPDATE wardrobe_items SET
        name = COALESCE($1, name), category = COALESCE($2, category), color = COALESCE($3, color),
        material = COALESCE($4, material), pattern = COALESCE($5, pattern), season = COALESCE($6, season),
        formality = COALESCE($7, formality), brand = COALESCE($8, brand), size = COALESCE($9, size),
        purchase_price = COALESCE($10, purchase_price), purchase_date = COALESCE($11, purchase_date),
        condition = COALESCE($12, condition), image_url = $13, auto_tags = COALESCE($14, auto_tags),
        wear_count = COALESCE($15, wear_count), last_worn = COALESCE($16, last_worn),
        is_donated = COALESCE($17, is_donated)
      WHERE id = $18 AND user_id = $19
      RETURNING *`,
      [name, category, color, material, pattern, seasonArr, formality, brand, size,
       purchase_price || null, purchase_date || null, condition, image_url,
       tagsObj ? JSON.stringify(tagsObj) : null,
       wear_count !== undefined ? parseInt(wear_count) : null,
       last_worn || null,
       is_donated !== undefined ? (is_donated === 'true' || is_donated === true) : null,
       req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE item
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM wardrobe_items WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST log wear
router.post('/:id/wear', async (req, res) => {
  try {
    const { occasion, weather, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];
    await pool.query(
      'UPDATE wardrobe_items SET wear_count = wear_count + 1, last_worn = $1 WHERE id = $2 AND user_id = $3',
      [today, req.params.id, req.user.id]
    );
    await pool.query(
      'INSERT INTO wear_logs (user_id, item_id, worn_date, occasion, weather, notes) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.id, req.params.id, today, occasion, weather, notes]
    );
    res.json({ message: 'Wear logged' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
