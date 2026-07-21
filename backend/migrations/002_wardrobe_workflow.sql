BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner';
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

CREATE TABLE IF NOT EXISTS wardrobe_fit_evidence (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_ref TEXT NOT NULL,
  garment_ref TEXT NOT NULL,
  variant_ref TEXT NOT NULL,
  measurement_version TEXT NOT NULL,
  size_system TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  fit_confidence NUMERIC(7,6) NOT NULL CHECK (fit_confidence >= 0 AND fit_confidence <= 1),
  inventory_available BOOLEAN NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  UNIQUE (tenant_id, user_ref, garment_ref, variant_ref, measurement_version)
);

CREATE TABLE IF NOT EXISTS wardrobe_recommendations (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  recommendation_ref TEXT NOT NULL,
  user_ref TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'draft' CHECK (stage IN ('draft','recommended','edited','approved','action_pending','acquired','returned','corrected','deleted')),
  preference_version TEXT NOT NULL,
  catalog_version TEXT NOT NULL,
  explanation TEXT NOT NULL,
  item_refs JSONB NOT NULL,
  created_by TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  provider_receipt TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, recommendation_ref),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS wardrobe_consents (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_ref TEXT NOT NULL,
  provider TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  consent_reference TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  deletion_receipt TEXT,
  UNIQUE (tenant_id, user_ref, provider, consent_reference)
);

CREATE TABLE IF NOT EXISTS wardrobe_integration_deliveries (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','failed','reconciled')),
  provider_receipt TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider, idempotency_key)
);

CREATE TABLE IF NOT EXISTS wardrobe_evaluations (
  id BIGSERIAL PRIMARY KEY,
  recommendation_id BIGINT REFERENCES wardrobe_recommendations(id),
  cohort_version TEXT NOT NULL,
  relevance NUMERIC(7,6) NOT NULL,
  diversity NUMERIC(7,6) NOT NULL,
  safety NUMERIC(7,6) NOT NULL,
  accessibility NUMERIC(7,6) NOT NULL,
  failure_case JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wardrobe_workflow_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  recommendation_id BIGINT NOT NULL REFERENCES wardrobe_recommendations(id),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_fit_user ON wardrobe_fit_evidence (tenant_id, user_ref, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_wardrobe_recommendations_stage ON wardrobe_recommendations (tenant_id, user_ref, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wardrobe_integrations_retry ON wardrobe_integration_deliveries (status, next_attempt_at);

CREATE OR REPLACE FUNCTION reject_wardrobe_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'wardrobe_workflow_audit is append-only';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'wardrobe_workflow_audit_append_only') THEN
    CREATE TRIGGER wardrobe_workflow_audit_append_only
      BEFORE UPDATE OR DELETE ON wardrobe_workflow_audit
      FOR EACH ROW EXECUTE FUNCTION reject_wardrobe_audit_mutation();
  END IF;
END;
$$;

COMMIT;
