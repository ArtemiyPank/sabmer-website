import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The schema Payload 3.90 expects of an auth collection.
 *
 * The upgrade from 3.88 was made for its security fixes (and for the Next.js
 * releases 3.90 requires, which close the critical Next.js advisories). It also
 * brings `reset_password_requested_at`, which Payload uses to throttle
 * password-reset requests — and it reads the column on every query of the
 * users table, so the admin cannot load without it.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "reset_password_requested_at";`)
}
