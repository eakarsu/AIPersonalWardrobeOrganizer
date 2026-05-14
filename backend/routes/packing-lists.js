const express = require('express');
const { pool } = require('../schema');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// GET all packing lists
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM packing_lists WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single packing list
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM packing_lists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Packing list not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create packing list
router.post('/', async (req, res) => {
  try {
    const { destination, travel_dates, occasion_types, items, ai_suggestions } = req.body;
    const result = await pool.query(
      'INSERT INTO packing_lists (user_id, destination, travel_dates, occasion_types, items, ai_suggestions) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, destination,
       travel_dates ? JSON.stringify(travel_dates) : null,
       occasion_types || [],
       items ? JSON.stringify(items) : null,
       ai_suggestions ? JSON.stringify(ai_suggestions) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update packing list
router.put('/:id', async (req, res) => {
  try {
    const { destination, travel_dates, occasion_types, items, ai_suggestions } = req.body;
    const result = await pool.query(`
      UPDATE packing_lists SET
        destination=COALESCE($1,destination), travel_dates=COALESCE($2,travel_dates),
        occasion_types=COALESCE($3,occasion_types), items=COALESCE($4,items), ai_suggestions=COALESCE($5,ai_suggestions)
      WHERE id=$6 AND user_id=$7 RETURNING *`,
      [destination,
       travel_dates ? JSON.stringify(travel_dates) : null,
       occasion_types,
       items ? JSON.stringify(items) : null,
       ai_suggestions ? JSON.stringify(ai_suggestions) : null,
       req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Packing list not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE packing list
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM packing_lists WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Packing list not found' });
    res.json({ message: 'Packing list deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
