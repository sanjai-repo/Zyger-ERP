CREATE TABLE IF NOT EXISTS semi_fg_mapping (
    id BIGSERIAL PRIMARY KEY,
    bom_mapping_id BIGINT NOT NULL REFERENCES bom_mapping(id) ON DELETE CASCADE,
    semi_fg_item_code VARCHAR(60) NOT NULL,
    semi_fg_item_name VARCHAR(300),
    line_no INTEGER,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_semi_fg_mapping_bom_id ON semi_fg_mapping(bom_mapping_id);

CREATE TABLE IF NOT EXISTS semi_fg_mapping_rm (
    id BIGSERIAL PRIMARY KEY,
    semi_fg_mapping_id BIGINT NOT NULL REFERENCES semi_fg_mapping(id) ON DELETE CASCADE,
    rm_item_code VARCHAR(60) NOT NULL,
    rm_item_name VARCHAR(300),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_semi_fg_mapping_rm_semi_id ON semi_fg_mapping_rm(semi_fg_mapping_id);