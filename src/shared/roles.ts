/**
 * Account roles.
 * - player: can join any party with a code.
 * - host:   can also open rooms and run games (uses server compute).
 * - admin:  host + the /admin page (promote users, close rooms, site settings).
 */
export type Role = "player" | "host" | "admin";

export const ROLES: readonly Role[] = ["player", "host", "admin"];

export const ROLE_LABEL: Record<Role, string> = {
  player: "Player",
  host: "Host",
  admin: "Admin",
};

export function isRole(value: unknown): value is Role {
  return value === "player" || value === "host" || value === "admin";
}

export function canHost(role: Role | null | undefined): boolean {
  return role === "host" || role === "admin";
}
