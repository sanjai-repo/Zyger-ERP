-- BOM Mapping (fresh workflow): one row per FG item from Item Master.
CREATE TABLE IF NOT EXISTS bom_mapping (
    id           BIGSERIAL PRIMARY KEY,
    fg_item_code VARCHAR(100) NOT NULL UNIQUE,
    fg_item_name VARCHAR(300),
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by   VARCHAR(100),
    created_at   TIMESTAMP,
    updated_by   VARCHAR(100),
    updated_at   TIMESTAMP,
    version      BIGINT
);

CREATE INDEX IF NOT EXISTS idx_bom_mapping_fg_item_code ON bom_mapping (fg_item_code);