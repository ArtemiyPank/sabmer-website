#!/bin/sh
# Bring the deployment's database to a state the deployment can use: the schema
# up to date with the config, and — on a database that has never been used —
# an admin account and the page copy. Run from inside the build.
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

# Only the production deployment may move the schema.
#
# Vercel builds a preview for every push to every branch, and the database
# integration hands previews the same credentials as production — the same
# database, not a copy of it. A preview build that migrated would therefore
# reshape the live database, and it would do it *early*: a branch is pushed
# before it is merged, so the schema would change under code that is still
# running. That is not a hypothetical either. This project's `drop_media`
# migration was applied to the live database by a preview build minutes before
# the production deploy that was meant to carry it.
#
# Previews still read the database and still build; they simply take the schema
# as they find it, and fall back to the copy in messages/*.json if what they
# find is older than they expect. Giving previews a database of their own — a
# Neon branch per deployment — is the fuller answer, and this is the cheap one.
if [ -n "$VERCEL_ENV" ] && [ "$VERCEL_ENV" != "production" ]; then
  echo "VERCEL_ENV=$VERCEL_ENV — not the production deployment, leaving the schema alone."
  exit 0
fi

# The direct connection for all of it: the pooled one is for the running site.
if [ -n "$DATABASE_URL_UNPOOLED" ]; then
  export DATABASE_URI="$DATABASE_URL_UNPOOLED"
fi

if [ "$MIGRATE_RESET" = "1" ]; then
  echo "MIGRATE_RESET is set: dropping every table and rebuilding from migrations."
  payload migrate:fresh --force-accept-warning
  payload migrate:status
  exec payload run scripts/bootstrap.ts
fi

payload run scripts/clear-dev-marker.ts
payload migrate
# Say where the database ended up. A migration that runs prints two lines and
# one that is already applied prints none, so silence on its own says nothing:
# without this the log cannot be told apart from a migration that was skipped.
payload migrate:status
exec payload run scripts/bootstrap.ts
