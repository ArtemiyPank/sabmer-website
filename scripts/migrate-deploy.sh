#!/bin/sh
# Bring the deployment's database up to the config, from inside the build.
#
# Two things this has to get right that the bare command does not.
#
# The connection: Neon hands out a pooled address and a direct one, and
# data-definition statements through a transaction pooler are not reliable. The
# direct one is used when it exists.
#
# The prompt: Payload asks for confirmation before migrating a database that
# has ever been pushed to in dev mode — a fair question to ask a person, and an
# unanswerable one inside a build. Left to ask it, the build simply waits, and
# then carries on as though the migration had run. That is not a hypothetical:
# it is how this project's first deploy shipped a schema a month out of date
# while reporting success. The flag that looks like it silences the question
# (`--force-accept-warning`) is read only by `migrate:fresh` — plain `migrate`
# asks regardless — so the marker it asks about is cleared first instead. See
# scripts/clear-dev-marker.ts.
#
# MIGRATE_RESET=1 drops every table first and builds the schema from the
# migrations alone. It is for one situation only — a database still carrying a
# shape that predates the migrations, which cannot be migrated into because the
# tables it would create are already there under different definitions. It
# destroys everything in that database, so it is not a setting: set it for a
# single deploy, watch it, and remove it again.
set -e

if [ -n "$DATABASE_URL_UNPOOLED" ]; then
  export DATABASE_URI="$DATABASE_URL_UNPOOLED"
fi

if [ "$MIGRATE_RESET" = "1" ]; then
  echo "MIGRATE_RESET is set: dropping every table and rebuilding from migrations."
  exec payload migrate:fresh --force-accept-warning
fi

payload run scripts/clear-dev-marker.ts
exec payload migrate
