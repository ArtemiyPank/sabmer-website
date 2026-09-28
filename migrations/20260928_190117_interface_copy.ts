import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The wording of the interface moves into the CMS, and the copy nothing
 * renders moves out.
 *
 * Added: the navigation, the buttons and the 404 page, which until now lived
 * only in messages/{locale}.json — so an editor found every word of the site
 * in the admin except the ones in the chrome.
 *
 * Dropped: the hero and `jobs_apply`, left behind by the layout that used to
 * have a hero section. They were seeded, stored and editable, and no page ever
 * read them; a field that changes nothing is worse than no field at all.
 *
 * Moved: `registration` becomes one value per language. It carries a word —
 * "ח.פ." — and a Russian or English page may want to write that word its own
 * way, so the single column is copied into all three locale rows on the way
 * through rather than dropped and refilled.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_content_locales" ADD COLUMN "registration" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "nav_about" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "nav_jobs" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "nav_reviews" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "nav_founders" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "nav_contacts" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "nav_home" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "buttons_whatsapp" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "buttons_whatsapp_jobs" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "buttons_whatsapp_jobs_text" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "buttons_review_prev" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "buttons_review_next" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "buttons_theme_toggle" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "buttons_lang_switch" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "buttons_floor_nav" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "not_found_title" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "not_found_body" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "not_found_home" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "not_found_drawing" varchar;
  UPDATE "site_content_locales" l SET "registration" = s."registration" FROM "site_content" s WHERE l."_parent_id" = s."id";
  ALTER TABLE "site_content" DROP COLUMN "registration";
  ALTER TABLE "site_content_locales" DROP COLUMN "hero_tagline";
  ALTER TABLE "site_content_locales" DROP COLUMN "hero_sub";
  ALTER TABLE "site_content_locales" DROP COLUMN "hero_cta_contact";
  ALTER TABLE "site_content_locales" DROP COLUMN "hero_cta_careers";
  ALTER TABLE "site_content_locales" DROP COLUMN "jobs_apply";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_content" ADD COLUMN "registration" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "hero_tagline" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "hero_sub" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "hero_cta_contact" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "hero_cta_careers" varchar;
  ALTER TABLE "site_content_locales" ADD COLUMN "jobs_apply" varchar;
  UPDATE "site_content" s SET "registration" = l."registration" FROM "site_content_locales" l WHERE l."_parent_id" = s."id" AND l."_locale" = 'ru';
  ALTER TABLE "site_content_locales" DROP COLUMN "registration";
  ALTER TABLE "site_content_locales" DROP COLUMN "nav_about";
  ALTER TABLE "site_content_locales" DROP COLUMN "nav_jobs";
  ALTER TABLE "site_content_locales" DROP COLUMN "nav_reviews";
  ALTER TABLE "site_content_locales" DROP COLUMN "nav_founders";
  ALTER TABLE "site_content_locales" DROP COLUMN "nav_contacts";
  ALTER TABLE "site_content_locales" DROP COLUMN "nav_home";
  ALTER TABLE "site_content_locales" DROP COLUMN "buttons_whatsapp";
  ALTER TABLE "site_content_locales" DROP COLUMN "buttons_whatsapp_jobs";
  ALTER TABLE "site_content_locales" DROP COLUMN "buttons_whatsapp_jobs_text";
  ALTER TABLE "site_content_locales" DROP COLUMN "buttons_review_prev";
  ALTER TABLE "site_content_locales" DROP COLUMN "buttons_review_next";
  ALTER TABLE "site_content_locales" DROP COLUMN "buttons_theme_toggle";
  ALTER TABLE "site_content_locales" DROP COLUMN "buttons_lang_switch";
  ALTER TABLE "site_content_locales" DROP COLUMN "buttons_floor_nav";
  ALTER TABLE "site_content_locales" DROP COLUMN "not_found_title";
  ALTER TABLE "site_content_locales" DROP COLUMN "not_found_body";
  ALTER TABLE "site_content_locales" DROP COLUMN "not_found_home";
  ALTER TABLE "site_content_locales" DROP COLUMN "not_found_drawing";`)
}
