#!/bin/sh
# Prepares the database and starts the API inside the container.
set -e

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

if [ "$SEED_DEMO_DATA" = "true" ]; then
  # Idempotent: creates or updates the administrator, teacher and student
  # accounts plus the demo catalog without duplicating records.
  echo "Seeding demo users and academic data..."
  node prisma/seed.mjs
fi

echo "Starting API on port ${PORT:-3010}..."
exec node dist/main.js
