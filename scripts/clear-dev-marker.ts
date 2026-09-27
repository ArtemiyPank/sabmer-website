/**
 * Removes the marker a dev-mode push leaves in `payload_migrations`.
 *
 * Payload records a row with `batch: -1` whenever it has reshaped a database
 * by pushing rather than by migrating, and refuses to migrate that database
 * afterwards without asking a person first. The question is a fair one, but it
 * cannot be asked inside a build: there is nobody to answer, the build simply
 * waits, and when it gives up it carries on as though the migration had run —
 * which is how this project's first deploy shipped a month-old schema while
 * reporting success. Worse, the flag that looks like it turns the question off
 * (`--force-accept-warning`) is read only by `migrate:fresh`; plain `migrate`
 * asks regardless.
 *
 * In a deploy the answer is always yes, so the marker is cleared here and the
 * migration proceeds. Nothing is lost by it: the row is a note about how the
 * schema got there, not part of the schema. If the database really cannot take
 * the migrations, they fail on their own terms and take the build down with
 * them, which is the outcome worth having.
 */
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

const marked = await payload.find({
  collection: "payload-migrations",
  where: { batch: { equals: -1 } },
  limit: 100,
  depth: 0,
});

if (marked.totalDocs === 0) {
  console.log("  no dev-mode marker; nothing to clear");
} else {
  for (const doc of marked.docs) {
    await payload.delete({ collection: "payload-migrations", id: doc.id });
  }
  console.log(
    `  cleared ${marked.totalDocs} dev-mode marker(s) — this database was last shaped by a push, not a migration`
  );
}
process.exit(0);
