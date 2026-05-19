# Audit Note — AIPersonalWardrobeOrganizer

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_06.md` section #19.

## Original Recommendations

### Gaps — AI Counterparts
- `/wear-pattern-analysis` — identify favorite pieces, unused items
- `/weather-pack` — weather-aware packing recommendations

### Gaps — Non-AI Features
- No size/fit tracking
- Missing shopping integration
- No social sharing
- Limited travel features

### Custom Feature Suggestions
1. Outfit orchestration agent (daily, weather/calendar/laundry-aware)
2. Computer vision closet audit (batch photo processing)
3. Shopping synergy (cost-per-wear-driven recommendations)
4. Seasonal rotation automation
5. Travel capsule builder

## Implemented (Mechanical)
- `POST /api/ai/wear-pattern-analysis` — added in `backend/routes/ai.js`. Pulls wardrobe items + aggregates from wear_logs and asks the model for favorite/underused items, rotation diversity score, category balance.
- `POST /api/ai/weather-pack` — added in `backend/routes/ai.js`. Accepts destination/dates/forecast/occasions and returns packing strategy with layering, weather risks, gaps.

Both follow existing style (auth, rate limiter, callOpenRouter, parseJSON, saveAnalysis).

## Backlog (deferred)

### NEEDS-PRODUCT-DECISION
- Size/fit schema & tracking — requires DB column additions and new UI flows.
- Social sharing — privacy & moderation policy unknown.
- Shopping integration — third-party API choice (Amazon/Shopify/affiliate).

### NEEDS-CREDS / NEW-DEPS
- Live weather API integration (OpenWeather, NWS) — requires API key.
- Outfit orchestration agent — needs scheduler/cron infra.

### TOO-RISKY (significant new code)
- Computer vision closet audit (multi-image batch + dedup + condition scoring).
- Travel capsule builder UX & state machine.
- Seasonal rotation automation (notifications/cron).

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS — FE already wired.
- `frontend/src/services/api.js` exports wrappers (`aiAutoTagPhoto`, `aiOutfitSuggest`, `aiPackingList`, `aiDeclutter`, `aiCostPerWear`, `aiSeasonalAnalysis`, `aiStyleProfile`, `getAIHistory`).
- `pages/AIPage.js`, `pages/AIInsightsPage.js`, and `pages/WardrobeAIAdvancedPage.js` POST directly to `/ai/wear-pattern-analysis` and `/ai/weather-pack`.
- All ten backend endpoints in `backend/routes/ai.js` have FE coverage. No frontend changes applied this pass.
