// Usage: npm run user:create -- <username> <password> [player|host|admin]
import { PASSWORD_MIN, USERNAME_RE, isRole } from "@party/shared";
import { hashPassword } from "../src/server/auth/password";
import { openStore } from "./store";

const [username, password, roleArg] = process.argv.slice(2);
const role = roleArg ?? "player";
if (!username || !password || !isRole(role)) {
  console.error("Usage: npm run user:create -- <username> <password> [player|host|admin]");
  process.exit(1);
}
if (!USERNAME_RE.test(username)) {
  console.error("Usernames are 3–20 letters, numbers or underscores.");
  process.exit(1);
}
if (password.length < PASSWORD_MIN) {
  console.error(`Passwords need at least ${PASSWORD_MIN} characters.`);
  process.exit(1);
}

const { store, kind, close } = await openStore();
if (await store.getUserByUsername(username)) {
  console.error(`"${username}" already exists. Use user:role to change their role.`);
  process.exit(1);
}
const user = await store.createUser({ username, displayName: username.slice(0, 14), passwordHash: await hashPassword(password), role, character: "blip" });
console.log(`Created ${user.username} (${user.role}) in the ${kind} database.`);
close();
