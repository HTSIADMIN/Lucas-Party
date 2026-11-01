// Small pieces both Full Moon views share.

import { FM_ROLES, FM_ROLE_ORDER, type FmRole } from "@party/shared";

/** "a Villager", "the Seer". */
export function aRole(role: FmRole): string {
  const info = FM_ROLES[role];
  return `${info.article} ${info.name}`;
}

/** Emoji + role name pill, tinted per role. */
export function RoleTag({ role, count }: { role: FmRole; count?: number }) {
  const info = FM_ROLES[role];
  const label = count === undefined ? info.name : `${count} ${count === 1 ? info.name : info.plural}`;
  return (
    <span className={`fm-role-tag is-${role}`}>
      <span aria-hidden="true">{info.emoji}</span> {label}
    </span>
  );
}

/** The cast list for tonight: "1 Werewolf · 1 Seer · …" (public knowledge). */
export function Lineup({ counts }: { counts: Record<FmRole, number> }) {
  return (
    <div className="fm-lineup">
      {FM_ROLE_ORDER.filter((role) => counts[role] > 0).map((role) => (
        <RoleTag key={role} role={role} count={counts[role]} />
      ))}
    </div>
  );
}
