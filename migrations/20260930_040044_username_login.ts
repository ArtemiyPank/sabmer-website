import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Accounts sign in with a username (see the users collection in
 * payload.config.ts), so every account needs one — including the one that
 * already exists and has only ever had an email address.
 *
 * What Payload generated for this added the column as NOT NULL in one
 * statement, which Postgres refuses on a table that already has rows: the
 * live database has the admin in it, so the deploy would have stopped there.
 * Instead the column arrives empty, the existing account is given its
 * username, and only then is it made required.
 *
 * The username comes from ADMIN_USERNAME, the same variable that names the
 * first admin on an empty database. It is read here, at the one moment it is
 * needed, rather than written into this file: it is half of the login, and
 * this repository is public.
 *
 * If there is an account without a username and no ADMIN_USERNAME to give it,
 * this stops rather than carry on. Payload runs each migration in a
 * transaction and exits non-zero on failure, so the schema is left as it was,
 * the build fails, and the site keeps running the previous deployment — where
 * the owner can still sign in. Carrying on would leave an admin nobody can log
 * into.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "users_email_idx";
    ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
    ALTER TABLE "users" ADD COLUMN "username" varchar;`)

  const { rows } = (await db.execute(
    sql`SELECT count(*)::int AS n FROM "users" WHERE "username" IS NULL`,
  )) as unknown as { rows: { n: number }[] }
  const waiting = rows[0]?.n ?? 0

  if (waiting > 1) {
    throw new Error(
      `${waiting} accounts have no username. Give each one by hand — this migration will only name a single admin.`,
    )
  }
  if (waiting === 1) {
    const name = process.env.ADMIN_USERNAME?.trim().toLowerCase()
    if (!name) {
      throw new Error(
        'The existing admin needs a username to sign in with, and ADMIN_USERNAME is not set. Set it and deploy again.',
      )
    }
    // stored the way Payload stores usernames (its own hook trims and
    // lowercases on save, and a raw UPDATE goes round the hooks)
    await db.execute(sql`UPDATE "users" SET "username" = ${name} WHERE "username" IS NULL`)
  }

  await db.execute(sql`
    ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
    CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "users_username_idx";
  ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  ALTER TABLE "users" DROP COLUMN "username";`)
}
