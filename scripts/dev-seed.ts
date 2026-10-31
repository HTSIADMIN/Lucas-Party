// Usage: npm run dev:seed
// Creates three local test accounts (dev_admin, dev_host, dev_player) with
// random passwords, saved to <DATA_DIR>/dev-accounts.json (gitignored, never
// leaves your machine). Only runs against the local SQLite database.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { CharacterId, Role } from "@party/shared";
import { hashPassword } from "../src/server/auth/password";
import { openStore } from "./store";

const { store, kind, dataDir, close } = await openStore();
if (kind !== "sqlite") {
  console.error("dev:seed only seeds the local SQLite database. Remove SUPABASE_SERVICE_ROLE_KEY from .env.local to use it.");
  process.exit(1);
}

const outFile = path.join(dataDir, "dev-accounts.json");
const saved: Record<string, { password: string; role: Role }> = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};
const accounts: [string, Role, CharacterId][] = [
  ["dev_admin", "admin", "blip"],
  ["dev_host", "host", "sunny"],
  ["dev_player", "player", "wisp"],
];
for (const [username, role, character] of accounts) {
  if (await store.getUserByUsername(username)) {
    console.log(`${username} already exists — skipped`);
    continue;
  }
  const password = randomBytes(9).toString("base64url");
  await store.createUser({ username, displayName: username.replace("dev_", "Dev ").slice(0, 14), passwordHash: await hashPassword(password), role, character });
  saved[username] = { password, role };
  console.log(`created ${username} (${role})`);
}
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(saved, null, 2));
console.log(`Passwords are in ${outFile}`);
close();
