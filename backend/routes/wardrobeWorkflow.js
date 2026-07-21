const express = require('express');
const { pool } = require('../schema');
const { validateFit, validateTransition } = require('../domain/wardrobePolicy');

const router = express.Router();
const tenantFor = (user) => String(user.tenant_id || user.tenantId || user.id);
const actorFor = (user) => String(user.id);

router.post('/recommendations', async (req, res) => {
  const client = await pool.connect();
  try {
    const { recommendation_ref, preference_version, catalog_version, explanation, item_refs, fit_evidence, idempotency_key, correlation_id } = req.body || {};
    if (!recommendation_ref || !preference_version || !catalog_version || !explanation || !Array.isArray(item_refs) || !item_refs.length || !Array.isArray(fit_evidence) || fit_evidence.length !== item_refs.length || !idempotency_key || !correlation_id) throw new Error('complete recommendation, item_refs, fit_evidence, idempotency_key, and correlation_id are required');
    const validatedFit = fit_evidence.map(validateFit);
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    const userRef = String(req.body.user_ref || actorId);
    if (userRef !== actorId && !['guardian', 'admin'].includes(req.user.role)) throw Object.assign(new Error('cannot create recommendations for another user'), { status: 403 });
    await client.query('BEGIN');
    let result = await client.query(
      `INSERT INTO wardrobe_recommendations
       (tenant_id, recommendation_ref, user_ref, stage, preference_version, catalog_version, explanation, item_refs, created_by, idempotency_key)
       VALUES ($1,$2,$3,'recommended',$4,$5,$6,$7,$8,$9)
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING *`,
      [tenantId, recommendation_ref, userRef, preference_version, catalog_version, explanation, JSON.stringify(item_refs), actorId, idempotency_key]
    );
    const inserted = result.rows.length === 1;
    if (!inserted) result = await client.query('SELECT * FROM wardrobe_recommendations WHERE tenant_id=$1 AND idempotency_key=$2', [tenantId, idempotency_key]);
    const recommendation = result.rows[0];
    if (inserted) {
      for (let index = 0; index < fit_evidence.length; index += 1) {
        const evidence = fit_evidence[index];
        await client.query(
          `INSERT INTO wardrobe_fit_evidence
           (tenant_id, user_ref, garment_ref, variant_ref, measurement_version, size_system, evidence_ref, fit_confidence, inventory_available, captured_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9)`,
          [tenantId, userRef, evidence.garment_ref, evidence.variant_ref, evidence.measurement_version, evidence.size_system, evidence.evidence_ref, validatedFit[index].fit_confidence, evidence.captured_at || new Date().toISOString()]
        );
      }
    }
    await client.query(
      `INSERT INTO wardrobe_workflow_audit (tenant_id, recommendation_id, actor_id, action, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'recommended','recommended',$4,$5) ON CONFLICT (tenant_id, correlation_id) DO NOTHING`,
      [tenantId, recommendation.id, actorId, JSON.stringify({ catalog_version, fit_evidence_count: validatedFit.length, review_required: validatedFit.some((item) => item.review_required) }), correlation_id]
    );
    await client.query('COMMIT');
    res.status(inserted ? 201 : 200).json(recommendation);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || (error.code === '23505' ? 409 : 400)).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/recommendations/:recommendationRef/transition', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = tenantFor(req.user);
    const actorId = actorFor(req.user);
    const { to_stage, expected_version, correlation_id, evidence = {} } = req.body || {};
    if (!to_stage || !Number.isInteger(expected_version) || !correlation_id) throw new Error('to_stage, integer expected_version, and correlation_id are required');
    await client.query('BEGIN');
    const priorAudit = await client.query('SELECT recommendation_id FROM wardrobe_workflow_audit WHERE tenant_id=$1 AND correlation_id=$2', [tenantId, correlation_id]);
    if (priorAudit.rows.length) {
      const existing = await client.query('SELECT * FROM wardrobe_recommendations WHERE id=$1', [priorAudit.rows[0].recommendation_id]);
      await client.query('COMMIT');
      return res.json(existing.rows[0]);
    }
    const current = await client.query('SELECT * FROM wardrobe_recommendations WHERE tenant_id=$1 AND recommendation_ref=$2 FOR UPDATE', [tenantId, req.params.recommendationRef]);
    if (!current.rows.length) throw Object.assign(new Error('recommendation not found'), { status: 404 });
    const recommendation = current.rows[0];
    if (recommendation.version !== expected_version) throw Object.assign(new Error('stale workflow version'), { status: 409 });
    validateTransition(recommendation.stage, to_stage, { ...evidence, role: req.user.role, actorId, createdBy: recommendation.created_by });
    const updated = await client.query('UPDATE wardrobe_recommendations SET stage=$1, provider_receipt=COALESCE($2,provider_receipt), version=version+1, updated_at=NOW() WHERE id=$3 RETURNING *', [to_stage, evidence.providerReceipt || null, recommendation.id]);
    await client.query(
      `INSERT INTO wardrobe_workflow_audit (tenant_id, recommendation_id, actor_id, action, from_stage, to_stage, evidence, correlation_id)
       VALUES ($1,$2,$3,'transition',$4,$5,$6,$7)`,
      [tenantId, recommendation.id, actorId, recommendation.stage, to_stage, JSON.stringify(evidence), correlation_id]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.status || 400).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
