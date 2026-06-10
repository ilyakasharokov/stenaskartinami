#!/usr/bin/env bash
# Adds artist.create and upload.upload permissions to Authenticated role in Strapi.
# Run on the server from repo root: bash scripts/fix-permissions.sh

set -e

docker exec stenaskartinami-postgres psql -U postgres -d stenaskartinami -c "
INSERT INTO up_permissions (action, created_at, updated_at, published_at)
VALUES
  ('api::artist.artist.create', NOW(), NOW(), NOW()),
  ('plugin::upload.content-api.upload', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO up_permissions_role_lnk (permission_id, role_id, permission_ord)
SELECT p.id, 1, 1
FROM up_permissions p
WHERE p.action IN ('api::artist.artist.create', 'plugin::upload.content-api.upload')
  AND NOT EXISTS (
    SELECT 1 FROM up_permissions_role_lnk lnk
    WHERE lnk.permission_id = p.id AND lnk.role_id = 1
  );
"

echo "Restarting Strapi to flush permissions cache..."
docker restart stenaskartinami-api-v5

echo "Done."
