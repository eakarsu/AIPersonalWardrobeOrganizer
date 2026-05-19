const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Exiting.');
  process.exit(1);
}

const { pool, initSchema } = require('./schema');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wardrobe-items', require('./routes/wardrobe-items'));
app.use('/api/outfits', require('./routes/outfits'));
app.use('/api/wear-logs', require('./routes/wear-logs'));
app.use('/api/packing-lists', require('./routes/packing-lists'));
app.use('/api/ai', require('./routes/ai'));
// Apply pass 5 — backlog extensions (fit, sharing, shopping, weather, orchestration, audit, capsules, rotation)
app.use('/api/wardrobe-ext', require('./routes/extensions'));

// Stats endpoint
const auth = require('./middleware/auth');
app.get('/api/stats', auth, async (req, res) => {
  try {
    const [itemsResult, outfitsResult, logsResult, cpwResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE', [req.user.id]),
      pool.query('SELECT COUNT(*) FROM outfits WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT COUNT(*) FROM wear_logs WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT AVG(purchase_price::float / NULLIF(wear_count, 0)) as avg_cpw, SUM(purchase_price) as total_value FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE', [req.user.id])
    ]);

    const categoriesResult = await pool.query(
      'SELECT category, COUNT(*) as count FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE GROUP BY category ORDER BY count DESC',
      [req.user.id]
    );

    res.json({
      totalItems: parseInt(itemsResult.rows[0].count),
      totalOutfits: parseInt(outfitsResult.rows[0].count),
      totalWearLogs: parseInt(logsResult.rows[0].count),
      avgCostPerWear: parseFloat(cpwResult.rows[0].avg_cpw || 0).toFixed(2),
      totalWardrobeValue: parseFloat(cpwResult.rows[0].total_value || 0).toFixed(2),
      categoriesBreakdown: categoriesResult.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected');
    // Add reset_token columns if not exist (migration)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
    `).catch(() => {});
    await initSchema();
    
// === Custom Feature Mounts (batch_06) ===
app.use('/api/cf-outfit-orchestration-agent', require('./routes/customFeat01_OutfitOrchestrationAgent'));
app.use('/api/cf-computer-vision-closet-audit', require('./routes/customFeat02_ComputerVisionClosetAudit'));
app.use('/api/cf-shopping-synergy', require('./routes/customFeat03_ShoppingSynergy'));
app.use('/api/cf-seasonal-rotation-automation', require('./routes/customFeat04_SeasonalRotationAutomation'));
app.use('/api/cf-travel-capsule-builder', require('./routes/customFeat05_TravelCapsuleBuilder'));


// === Batch 06 Gaps & Frontend Mounts ===
app.use('/api/gap-wear', require('./routes/gapFeat_wear'));
app.use('/api/gap-packing', require('./routes/gapFeat_packing'));
app.use('/api/gap-no-size-fit-tracking-for-new-purchase-recommendati', require('./routes/gapFeat_no_size_fit_tracking_for_new_purchase_recommendati'));
app.use('/api/gap-no-shopping-integration', require('./routes/gapFeat_no_shopping_integration'));
app.use('/api/gap-no-social-sharing-outfit-inspiration', require('./routes/gapFeat_no_social_sharing_outfit_inspiration'));
app.use('/api/gap-limited-travel-features-only-packing-lists', require('./routes/gapFeat_limited_travel_features_only_packing_lists'));
app.use('/api/gap-limited-notifications-layer-1-mention', require('./routes/gapFeat_limited_notifications_layer_1_mention'));
app.use('/api/gap-no-webhooks', require('./routes/gapFeat_no_webhooks'));
app.use('/api/gap-no-mobile-app', require('./routes/gapFeat_no_mobile_app'));
app.use('/api/gap-only-8-frontend-pages', require('./routes/gapFeat_only_8_frontend_pages'));

// === Custom Views (must be mounted BEFORE the 404 handler) ===
app.use('/api/custom-views', require('./routes/customViews'));

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));

app.listen(PORT, () => console.log(`Wardrobe backend running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
