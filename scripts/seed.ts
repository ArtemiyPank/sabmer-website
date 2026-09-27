/**
 * Overwrites the site-content global from messages/{ru,he,en}.json, and
 * creates the first admin user if there is none.
 *
 * Unlike `bootstrap.ts` this always writes, so it will discard anything edited
 * in the admin. It is for a database being set up by hand, not for a deploy.
 *
 * Run: npm run seed
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { createFirstAdmin, writeContent } from "./content.js";

const payload = await getPayload({ config });

const users = await payload.find({ collection: "users", limit: 1, depth: 0 });
if (users.totalDocs === 0) await createFirstAdmin(payload);
else console.log("  admin user already exists, left alone");

await writeContent(payload);
process.exit(0);
