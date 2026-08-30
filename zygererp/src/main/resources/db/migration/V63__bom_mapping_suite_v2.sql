-- BOM Mapping suite v2 (doc-code model: BMP / SFM / FGM / MBM)
DROP TABLE IF EXISTS multi_level_bom_line;
DROP TABLE IF EXISTS multi_level_bom;
DROP TABLE IF EXISTS fg_mapping_line;
DROP TABLE IF EXISTS fg_mapping;
DROP TABLE IF EXISTS semi_fg_mapping_rm;
DROP TABLE IF EXISTS semi_fg_mapping;
DROP TABLE IF EXISTS bom_mapping;

CREATE TABLE bom_mapping (
    id BIGSERIAL PRIMARY KEY,
    auto_code VARCHAR(40) NOT NULL,
    name VARCHAR(200),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uq_bom_mapping_auto_code ON bom_mapping(auto_code);
CREATE INDEX idx_bom_mapping_active ON bom_mapping(active);

CREATE TABLE semi_fg_mapping (
    id BIGSERIAL PRIMARY KEY,
    bom_mapping_id BIGINT NOT NULL REFERENCES bom_mapping(id) ON DELETE CASCADE,
    auto_code VARCHAR(40) NOT NULL,
    name VARCHAR(200),
    semi_fg_item_code VARCHAR(60) NOT NULL,
    semi_fg_item_name VARCHAR(300),
    line_no INTEGER,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uq_semi_fg_mapping_auto_code ON semi_fg_mapping(auto_code);
CREATE INDEX idx_semi_fg_mapping_bom_id ON semi_fg_mapping(bom_mapping_id);

CREATE TABLE semi_fg_mapping_rm (
    id BIGSERIAL PRIMARY KEY,
    semi_fg_mapping_id BIGINT NOT NULL REFERENCES semi_fg_mapping(id) ON DELETE CASCADE,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(300),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_semi_fg_mapping_rm_semi_id ON semi_fg_mapping_rm(semi_fg_mapping_id);

CREATE TABLE fg_mapping (
    id BIGSERIAL PRIMARY KEY,
    bom_mapping_id BIGINT NOT NULL REFERENCES bom_mapping(id) ON DELETE CASCADE,
    auto_code VARCHAR(40) NOT NULL,
    name VARCHAR(200),
    fg_item_code VARCHAR(60) NOT NULL,
    fg_item_name VARCHAR(300),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uq_fg_mapping_auto_code ON fg_mapping(auto_code);
CREATE INDEX idx_fg_mapping_bom_id ON fg_mapping(bom_mapping_id);

CREATE TABLE fg_mapping_line (
    id BIGSERIAL PRIMARY KEY,
    fg_mapping_id BIGINT NOT NULL REFERENCES fg_mapping(id) ON DELETE CASCADE,
    semi_fg_mapping_id BIGINT NOT NULL REFERENCES semi_fg_mapping(id) ON DELETE CASCADE,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_fg_mapping_line_fg_id ON fg_mapping_line(fg_mapping_id);
CREATE INDEX idx_fg_mapping_line_semi_id ON fg_mapping_line(semi_fg_mapping_id);

CREATE TABLE multi_level_bom (
    id BIGSERIAL PRIMARY KEY,
    bom_mapping_id BIGINT NOT NULL REFERENCES bom_mapping(id) ON DELETE CASCADE,
    auto_code VARCHAR(40) NOT NULL,
    name VARCHAR(200),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uq_multi_level_bom_auto_code ON multi_level_bom(auto_code);
CREATE INDEX idx_multi_level_bom_bom_id ON multi_level_bom(bom_mapping_id);

CREATE TABLE multi_level_bom_line (
    id BIGSERIAL PRIMARY KEY,
    multi_level_bom_id BIGINT NOT NULL REFERENCES multi_level_bom(id) ON DELETE CASCADE,
    fg_mapping_id BIGINT NOT NULL REFERENCES fg_mapping(id) ON DELETE CASCADE,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_multi_level_bom_line_mbm_id ON multi_level_bom_line(multi_level_bom_id);
CREATE INDEX idx_multi_level_bom_line_fg_id ON multi_level_bom_line(fg_mapping_id);