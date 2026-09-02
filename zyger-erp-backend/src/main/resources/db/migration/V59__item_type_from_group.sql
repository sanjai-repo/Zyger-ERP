-- Item Group is the source of truth for item categorization.
-- Normalize existing group types to the canonical set (SEMI_FG / RAW_MATERIAL / FG / PURCHASABLE / CUSTOMER_SUPPLIED).

UPDATE item_group SET item_type = 'SEMI_FG'
 WHERE COALESCE(item_type,'') IN ('', 'Manufacturing Item', 'Purchasable Item')
   AND UPPER(name) LIKE '%SEMI%';

UPDATE item_group SET item_type = 'FG'
 WHERE COALESCE(item_type,'') IN ('', 'Manufacturing Item', 'Purchasable Item')
   AND (UPPER(name) LIKE '%FG%' OR UPPER(name) LIKE '%FINISHED%');

UPDATE item_group SET item_type = 'RAW_MATERIAL'
 WHERE COALESCE(item_type,'') IN ('', 'Manufacturing Item', 'Purchasable Item')
   AND (UPPER(name) LIKE '%RM%' OR UPPER(name) LIKE '%RAW%' OR UPPER(name) LIKE '%MATERIAL%');

UPDATE item_group SET item_type = 'CUSTOMER_SUPPLIED'
 WHERE COALESCE(item_type,'') IN ('', 'Manufacturing Item', 'Purchasable Item')
   AND UPPER(name) LIKE '%CUSTOMER%';

UPDATE item_group SET item_type = 'PURCHASABLE'
 WHERE COALESCE(item_type,'') IN ('', 'Manufacturing Item', 'Purchasable Item');

-- Refresh item type from its group for items that have a group.
UPDATE item_master i SET item_type = g.item_type
  FROM item_group g
 WHERE i.item_group_id = g.id AND g.item_type IS NOT NULL AND g.item_type <> '';