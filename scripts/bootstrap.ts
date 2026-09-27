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
 * It runs once and then never does anything again: a database with a user in
 * it is a database somebody is already looking after, and a deploy must not
 * reach in and overwrite what they have written.
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { createFirstAdmin, writeContent } from "./content.js";

const payload = await getPayload({ config });

const users = await payload.find({ collection: "users", limit: 1, depth: 0 });
if (users.totalDocs > 0) {
  console.log("Bootstrap: the database is already set up, leaving it alone.");
  process.exit(0);
}

console.log("Bootstrap: an empty database — setting it up.");
await createFirstAdmin(payload);
await writeContent(payload);
console.log("Bootstrap: done.");
process.exit(0);
