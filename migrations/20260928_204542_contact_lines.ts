import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The Contacts section stops having a fixed shape.
 *
 * `email` and `address` were two slots a developer chose, and the site had to
 * say exactly those two things and nothing else. They are replaced by a list
 * the editor adds to: an email, a second number, an office, whatever the
 * section needs — each with an optional link, each written per language.
 *
 * Neither value is carried across. The address is being taken off the site
 * altogether, and the email was a placeholder that never existed
 * (`info@sabmer.example`) — carrying a fiction forward as a contact line is
 * worse than an empty list.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_content_contact_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"href" varchar
  );
  
  ALTER TABLE "site_content_contact_lines" ADD CONSTRAINT "site_content_contact_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_content"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_content_contact_lines_order_idx" ON "site_content_contact_lines" USING btree ("_order");
  CREATE INDEX "site_content_contact_lines_parent_id_idx" ON "site_content_contact_lines" USING btree ("_parent_id");
  CREATE INDEX "site_content_contact_lines_locale_idx" ON "site_content_contact_lines" USING btree ("_locale");
  ALTER TABLE "site_content" DROP COLUMN "email";
  ALTER TABLE "site_content_locales" DROP COLUMN "address";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_content_contact_lines" CASCADE;
  ALTER TABLE "site_content" ADD COLUMN "email" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "address" varchar;`)
}
