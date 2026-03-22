-- Rename district_type to district_size (enrollment-based size, not locale type)

ALTER TABLE district_candidates RENAME COLUMN district_type TO district_size;

-- Update attribute definition key for consistency
UPDATE district_attribute_definitions SET key = 'district_size', label = 'District Size' WHERE key = 'district_type';
