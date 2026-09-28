/**
 * First-run setup for a database that has just been migrated, run as part of
 * the deploy (see `build:deploy`).
 *
 * It exists to close a window rather than to save typing. A freshly migrated
 * database has no users in it, and Payload quite reasonably offers
 * `/admin/create-first-user` to whoever asks — which, on a site that is
 * already published, is whoever finds it first. Doing this during the build
 * means the account exists before the deployment is ever served.
 *
 * It sets a database up once and then never overwrites anything again: a
 * database with a user in it is a database somebody is already looking after.
 * What it goes on doing is filling in fields that have never held a value —
 * the ones a deploy has just added — so the admin shows what the site says
 * instead of a row of empty boxes. See `fillBlanks`.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { createFirstAdmin, fillBlanks, writeContent } from "./content.js";

const payload = await getPayload({ config });

const users = await payload.find({ collection: "users", limit: 1, depth: 0 });
if (users.totalDocs > 0) {
  console.log("Bootstrap: the database is already set up.");
  // ...except for fields that have never held anything, which a deploy that
  // adds them leaves empty. Nothing already written is touched.
  await fillBlanks(payload);
  process.exit(0);
}

console.log("Bootstrap: an empty database — setting it up.");
await createFirstAdmin(payload);
await writeContent(payload);
console.log("Bootstrap: done.");
process.exit(0);
