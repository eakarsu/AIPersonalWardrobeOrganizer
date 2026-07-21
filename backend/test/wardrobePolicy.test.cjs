const test = require('node:test');
const assert = require('node:assert/strict');
const { validateFit, evaluateRecommendation, validateTransition } = require('../domain/wardrobePolicy');

const fit = { measurement_version: 'm3', size_system: 'US', garment_ref: 'g1', variant_ref: 'v1', evidence_ref: 'measure-3', inventory_available: true, fit_confidence: 0.9 };

test('accepts available versioned fit evidence', () => {
  assert.deepEqual(validateFit(fit), { fit_confidence: 0.9, review_required: false });
});

test('flags lower confidence for review', () => {
  assert.equal(validateFit({ ...fit, fit_confidence: 0.7 }).review_required, true);
});

test('fails closed when inventory is unavailable', () => {
  assert.throws(() => validateFit({ ...fit, inventory_available: false }), /variant unavailable/);
});

test('blocks unsafe or inaccessible recommendation evaluations', () => {
  assert.equal(evaluateRecommendation({ relevance: 1, diversity: 1, safety: 1, accessibility: 0.79 }).blocked, true);
});

test('requires explicit owner action approval', () => {
  assert.throws(() => validateTransition('approved', 'action_pending', { role: 'owner' }), /owner action approval/);
  assert.equal(validateTransition('approved', 'action_pending', { role: 'owner', ownerApproval: true }), true);
});

test('requires commerce and deletion receipts', () => {
  assert.throws(() => validateTransition('action_pending', 'acquired', { role: 'owner', ownerApproval: true }), /commerce receipt/);
  assert.throws(() => validateTransition('draft', 'deleted', {}), /deletion receipts/);
});
