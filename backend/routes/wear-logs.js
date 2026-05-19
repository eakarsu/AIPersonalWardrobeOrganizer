const express = require('express');
const { pool } = require('../schema');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// GET all wear logs
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT wl.*, wi.name as item_name, wi.category, o.name as outfit_name
       FROM wear_logs wl
       LEFT JOIN wardrobe_items wi ON wl.item_id = wi.id
       LEFT JOIN outfits o ON wl.outfit_id = o.id
       WHERE wl.user_id = $1
       ORDER BY wl.worn_date DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM wear_logs WHERE user_id = $1', [req.user.id]);
    res.json({ logs: result.rows, total: parseInt(countResult.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create wear log
router.post('/', async (req, res) => {
  try {
    const { item_id, outfit_id, worn_date, occasion, weather, notes } = req.body;
    if (!worn_date) return res.status(400).json({ error: 'worn_date is required' });
    const result = await pool.query(
      'INSERT INTO wear_logs (user_id, item_id, outfit_id, worn_date, occasion, weather, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, item_id || null, outfit_id || null, worn_date, occasion, weather, notes]
    );
    // Increment wear count if item_id given
    if (item_id) {
      await pool.query('UPDATE wardrobe_items SET wear_count = wear_count + 1, last_worn = $1 WHERE id = $2 AND user_id = $3',
        [worn_date, item_id, req.user.id]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE wear log
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM wear_logs WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Log deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
