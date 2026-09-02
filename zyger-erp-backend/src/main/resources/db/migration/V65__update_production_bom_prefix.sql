-- Migration to update production-bom doc prefix to BOM in numbering_config
UPDATE numbering_config SET prefix = 'BOM' WHERE doc_type = 'production-bom';
