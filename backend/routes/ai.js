const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const { pool } = require('../schema');
const auth = require('../middleware/auth');
const router = express.Router();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

// Multer setup
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Rate limiter: 20 requests per hour per user
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user ? `user:${req.user.id}` : req.ip,
  message: { error: 'AI rate limit exceeded. Max 20 requests per hour.' }
});

router.use(auth);

async function callOpenRouter(messages, maxTokens = 1500) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
      'X-Title': 'AI Personal Wardrobe Organizer'
    },
    body: JSON.stringify({ model: AI_MODEL, messages, max_tokens: maxTokens, temperature: 0.7 })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'AI service error');
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e) { return null; }
}

async function saveAnalysis(userId, endpoint, itemId, result) {
  try {
    await pool.query(
      'INSERT INTO ai_analyses (user_id, endpoint, item_id, result) VALUES ($1,$2,$3,$4)',
      [userId, endpoint, itemId || null, JSON.stringify(result)]
    );
  } catch (e) { /* non-fatal */ }
}

// POST /api/ai/auto-tag-photo — multer upload, base64 encode, vision AI
router.post('/auto-tag-photo', aiRateLimiter, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const imageBuffer = fs.readFileSync(req.file.path);
    const b64 = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const content = await callOpenRouter([{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${b64}` } },
        { type: 'text', text: 'Analyze this clothing item. Return JSON: {category, color, material, pattern, season: [], formality, brand_visible, condition, suggested_tags: []}' }
      ]
    }]);

    const parsed = parseJSON(content) || {};
    await saveAnalysis(req.user.id, 'auto-tag-photo', null, parsed);
    res.json({ content, parsed, imageUrl: `/uploads/${req.file.filename}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/outfit-suggest
router.post('/outfit-suggest', aiRateLimiter, async (req, res) => {
  try {
    const { occasion, weather, mood } = req.body;
    const itemsResult = await pool.query(
      'SELECT id, name, category, color, material, formality, season, wear_count FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE LIMIT 100',
      [req.user.id]
    );
    const wardrobe = itemsResult.rows;

    const prompt = `You are a personal stylist AI. Based on the wardrobe below, suggest an outfit.

Occasion: ${occasion || 'casual'}
Weather: ${weather || 'mild'}
Mood: ${mood || 'comfortable'}

Wardrobe items:
${wardrobe.map(i => `ID:${i.id} Name:${i.name} Category:${i.category} Color:${i.color} Formality:${i.formality} Season:${JSON.stringify(i.season)} WearCount:${i.wear_count}`).join('\n')}

Return JSON: {outfit: [{item_id, reason}], style_notes, color_harmony_score}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const parsed = parseJSON(content) || {};
    await saveAnalysis(req.user.id, 'outfit-suggest', null, parsed);
    res.json({ content, parsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/packing-list
router.post('/packing-list', aiRateLimiter, async (req, res) => {
  try {
    const { destination, dates, occasions, weather_forecast } = req.body;
    const itemsResult = await pool.query(
      'SELECT id, name, category, color, formality, season FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE LIMIT 100',
      [req.user.id]
    );
    const wardrobe = itemsResult.rows;

    const prompt = `You are a travel packing AI. Create a packing list from the user's wardrobe.

Destination: ${destination || 'unknown'}
Travel Dates: ${dates || 'unknown'}
Occasions: ${(occasions || []).join(', ') || 'general'}
Weather Forecast: ${weather_forecast || 'unknown'}

Wardrobe items:
${wardrobe.map(i => `ID:${i.id} Name:${i.name} Category:${i.category} Color:${i.color} Formality:${i.formality}`).join('\n')}

Return JSON: {essential_items: [item_ids], optional_items: [item_ids], gaps: [{item_type, reason}], total_outfits_possible}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const parsed = parseJSON(content) || {};

    // Save packing list
    const saved = await pool.query(
      'INSERT INTO packing_lists (user_id, destination, travel_dates, occasion_types, ai_suggestions) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, destination, JSON.stringify({ dates }), occasions || [], JSON.stringify(parsed)]
    );
    await saveAnalysis(req.user.id, 'packing-list', null, parsed);
    res.json({ content, parsed, packingListId: saved.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/declutter-suggestions
router.post('/declutter-suggestions', aiRateLimiter, async (req, res) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateStr = ninetyDaysAgo.toISOString().split('T')[0];

    const itemsResult = await pool.query(
      `SELECT id, name, category, brand, purchase_price, wear_count, last_worn, condition, created_at
       FROM wardrobe_items
       WHERE user_id = $1 AND is_donated = FALSE
       AND (last_worn IS NULL OR last_worn < $2)
       ORDER BY wear_count ASC, last_worn ASC NULLS FIRST
       LIMIT 50`,
      [req.user.id, dateStr]
    );
    const items = itemsResult.rows;

    if (items.length === 0) {
      return res.json({ content: 'Great news! All your items have been worn recently.', parsed: { donate_candidates: [], keep_reasons: {}, estimated_resale_value: 0 } });
    }

    const prompt = `You are a wardrobe declutter AI. Analyze these clothing items not worn in 90+ days.

Items:
${items.map(i => `ID:${i.id} Name:${i.name} Category:${i.category} Brand:${i.brand} Price:$${i.purchase_price || 0} WearCount:${i.wear_count} LastWorn:${i.last_worn || 'never'} Condition:${i.condition}`).join('\n')}

Return JSON: {donate_candidates: [{item_id, reason, resale_potential}], keep_reasons: {item_id: reason}, estimated_resale_value}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const parsed = parseJSON(content) || {};
    await saveAnalysis(req.user.id, 'declutter-suggestions', null, parsed);
    res.json({ content, parsed, itemCount: items.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/cost-per-wear
router.post('/cost-per-wear', aiRateLimiter, async (req, res) => {
  try {
    const itemsResult = await pool.query(
      'SELECT id, name, category, brand, purchase_price, wear_count FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE',
      [req.user.id]
    );
    const items = itemsResult.rows;

    const itemsWithCPW = items.map(i => ({
      ...i,
      cost_per_wear: i.purchase_price && i.wear_count > 0 ? (parseFloat(i.purchase_price) / i.wear_count).toFixed(2) : null
    }));

    const prompt = `You are a fashion finance AI. Analyze the cost-per-wear of these clothing items.

Items with cost-per-wear data:
${itemsWithCPW.map(i => `ID:${i.id} Name:${i.name} Category:${i.category} Price:$${i.purchase_price || 0} WearCount:${i.wear_count} CostPerWear:${i.cost_per_wear ? '$' + i.cost_per_wear : 'N/A'}`).join('\n')}

Return JSON: {high_value_items: [], poor_value_items: [], recommendations: []}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const parsed = parseJSON(content) || {};
    await saveAnalysis(req.user.id, 'cost-per-wear', null, parsed);
    res.json({ content, parsed, items: itemsWithCPW });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/seasonal-analysis
router.post('/seasonal-analysis', aiRateLimiter, async (req, res) => {
  try {
    const { target_season } = req.body;
    const season = target_season || 'Summer';

    const itemsResult = await pool.query(
      'SELECT id, name, category, color, material, season, formality, wear_count FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE',
      [req.user.id]
    );
    const items = itemsResult.rows;

    const seasonItems = items.filter(i => i.season && (i.season.includes(season) || i.season.includes('All Season')));

    const prompt = `You are a fashion wardrobe analyst AI. Analyze this wardrobe for the upcoming ${season} season.

All wardrobe items: ${items.length}
Items suitable for ${season}: ${seasonItems.length}

Seasonal items:
${seasonItems.map(i => `ID:${i.id} Name:${i.name} Category:${i.category} Color:${i.color} Formality:${i.formality} Wears:${i.wear_count}`).join('\n') || 'None tagged'}

Non-seasonal items currently:
${items.filter(i => !i.season || !i.season.includes(season)).slice(0, 20).map(i => `ID:${i.id} Name:${i.name} Category:${i.category}`).join('\n')}

Return JSON: {
  season_readiness_score: (1-10),
  coverage_by_category: {category: {count, adequacy: "good/fair/poor"}},
  gap_items: [{category, reason, priority: "high/medium/low"}],
  transition_items: [item_ids],
  seasonal_recommendations: [string],
  capsule_wardrobe_suggestion: [{category, description, why}]
}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const parsed = parseJSON(content) || {};
    await saveAnalysis(req.user.id, 'seasonal-analysis', null, parsed);
    res.json({ content, parsed, season, seasonItemCount: seasonItems.length, totalItems: items.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/style-profile
router.post('/style-profile', aiRateLimiter, async (req, res) => {
  try {
    const { body_type, skin_tone, lifestyle, preferences } = req.body;

    const itemsResult = await pool.query(
      'SELECT category, color, material, formality, brand, wear_count FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE ORDER BY wear_count DESC LIMIT 50',
      [req.user.id]
    );
    const items = itemsResult.rows;

    // Analyze wardrobe patterns
    const categoryFreq = {};
    const colorFreq = {};
    const formalityFreq = {};
    items.forEach(i => {
      if (i.category) categoryFreq[i.category] = (categoryFreq[i.category] || 0) + i.wear_count;
      if (i.color) colorFreq[i.color] = (colorFreq[i.color] || 0) + 1;
      if (i.formality) formalityFreq[i.formality] = (formalityFreq[i.formality] || 0) + 1;
    });

    const prompt = `You are an expert personal stylist AI. Build a style profile for this person.

User-provided info:
Body Type: ${body_type || 'Not specified'}
Skin Tone: ${skin_tone || 'Not specified'}
Lifestyle: ${lifestyle || 'Not specified'}
Style Preferences: ${preferences || 'Not specified'}

Wardrobe analysis (from actual clothes owned):
Category distribution: ${JSON.stringify(categoryFreq)}
Common colors: ${JSON.stringify(colorFreq)}
Formality levels: ${JSON.stringify(formalityFreq)}

Return JSON: {
  style_personality: string,
  core_aesthetic: string,
  recommended_color_palette: [string],
  body_type_recommendations: [string],
  capsule_essentials: [{item, why}],
  brands_to_explore: [string],
  style_rules: [string],
  shopping_priorities: [{item, priority: "high/medium/low", reason}]
}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const parsed = parseJSON(content) || {};
    await saveAnalysis(req.user.id, 'style-profile', null, parsed);
    res.json({ content, parsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/wear-pattern-analysis — analyze wear logs to identify favorite pieces, unused items
router.post('/wear-pattern-analysis', aiRateLimiter, async (req, res) => {
  try {
    const itemsResult = await pool.query(
      `SELECT id, name, category, color, brand, purchase_price, wear_count, last_worn, created_at
       FROM wardrobe_items
       WHERE user_id = $1 AND is_donated = FALSE
       ORDER BY wear_count DESC
       LIMIT 100`,
      [req.user.id]
    );
    const items = itemsResult.rows;

    const logsResult = await pool.query(
      `SELECT item_id, COUNT(*) AS log_count, MAX(worn_on) AS last_log
       FROM wear_logs
       WHERE user_id = $1
       GROUP BY item_id
       ORDER BY log_count DESC
       LIMIT 100`,
      [req.user.id]
    ).catch(() => ({ rows: [] }));

    const prompt = `You are a wardrobe pattern analyst AI. Identify wear-pattern insights.

Items (sorted by wear_count desc):
${items.map(i => `ID:${i.id} Name:${i.name} Category:${i.category} Color:${i.color} Brand:${i.brand || 'n/a'} WearCount:${i.wear_count} LastWorn:${i.last_worn || 'never'} OwnedSince:${i.created_at}`).join('\n')}

Wear log aggregates (item_id, log_count, last_log):
${logsResult.rows.map(r => `ID:${r.item_id} Logs:${r.log_count} Last:${r.last_log}`).join('\n')}

Return JSON: {
  favorite_items: [{item_id, why}],
  underused_items: [{item_id, reason}],
  rotation_diversity_score: (1-10),
  category_balance: {category: "over/under/balanced"},
  recommendations: [string]
}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const parsed = parseJSON(content) || {};
    await saveAnalysis(req.user.id, 'wear-pattern-analysis', null, parsed);
    res.json({ content, parsed, itemCount: items.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ai/weather-pack — weather-aware packing recommendations
router.post('/weather-pack', aiRateLimiter, async (req, res) => {
  try {
    const { destination, dates, weather_forecast, occasions } = req.body;
    const itemsResult = await pool.query(
      'SELECT id, name, category, color, material, formality, season FROM wardrobe_items WHERE user_id = $1 AND is_donated = FALSE LIMIT 100',
      [req.user.id]
    );
    const wardrobe = itemsResult.rows;

    const prompt = `You are a weather-aware travel packing AI. Build a packing list calibrated to the forecast.

Destination: ${destination || 'unknown'}
Travel Dates: ${dates || 'unknown'}
Weather Forecast (highs/lows/precip/wind): ${weather_forecast || 'unknown'}
Occasions: ${(occasions || []).join(', ') || 'general'}

Wardrobe items:
${wardrobe.map(i => `ID:${i.id} Name:${i.name} Category:${i.category} Color:${i.color} Material:${i.material} Formality:${i.formality} Season:${JSON.stringify(i.season)}`).join('\n')}

Return JSON: {
  weather_summary: string,
  must_pack: [{item_id, reason}],
  optional: [{item_id, reason}],
  layering_strategy: [string],
  weather_risks: [{risk, mitigation}],
  gaps: [{item_type, reason}]
}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const parsed = parseJSON(content) || {};
    await saveAnalysis(req.user.id, 'weather-pack', null, parsed);
    res.json({ content, parsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ai/history — paginated ai_analyses
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const result = await pool.query(
      'SELECT * FROM ai_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM ai_analyses WHERE user_id = $1', [req.user.id]);
    res.json({ analyses: result.rows, total: parseInt(countResult.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
