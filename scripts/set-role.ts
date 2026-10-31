// Usage: npm run user:role -- <username> <player|host|admin>
import { isRole } from "@party/shared";
import { openStore } from "./store";

const [username, role] = process.argv.slice(2);
if (!username || !isRole(role)) {
  console.error("Usage: npm run user:role -- <username> <player|host|admin>");
  process.exit(1);
}

const { store, kind, close } = await openStore();
const user = await store.getUserByUsername(username);
if (!user) {
  console.error(`No user named "${username}" in the ${kind} database. They need to sign up first.`);
  process.exit(1);
}
await store.updateUser(user.id, { role });
console.log(`${user.username} is now ${role} (${kind}).`);
close();
