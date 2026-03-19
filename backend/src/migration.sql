-- ============================================
-- Migration — tables du système (4 tables)
-- ============================================

-- AGENTS (metadata only — tout le contenu vit dans agent_versions.snapshot)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    current_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AGENT VERSIONS (full snapshot: config + tasks + tools)
CREATE TABLE IF NOT EXISTS agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    label TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    snapshot JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id, version)
);

-- PIPELINES (metadata only — tout le contenu vit dans pipeline_versions.snapshot)
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    current_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- PIPELINE VERSIONS (full snapshot: config + tools)
CREATE TABLE IF NOT EXISTS pipeline_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    version INT NOT NULL,
    label TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    snapshot JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pipeline_id, version)
);

-- ============================================
-- INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agent_versions_agent ON agent_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_versions_pipeline ON pipeline_versions(pipeline_id);
