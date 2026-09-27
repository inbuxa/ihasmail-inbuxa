/**
 * Locked accounts handed to the reader (inbuxa audit-hold-lock spec, AL-7).
 *
 * The server marks one in the account's `urn:inbuxa:jmap` capability, as
 * `delegation: {locked, access, sendAs, until}`. Only that mark makes an
 * account switchable: a server advertises every capability on any shared
 * account, so "it has mail" proves nothing about what was handed over.
 */

import type { Id, JmapSession } from "@/jmap/types";

export type DelegationAccess = "read" | "organize" | "full";

export interface Delegation {
  locked: boolean;
  access: DelegationAccess;
  sendAs: boolean;
  /** UTC date the delegation ends, if it does. */
  until: string | null;
}

export interface DelegatedAccount {
  id: Id;
  name: string;
  delegation: Delegation;
}

const INBUXA = "urn:inbuxa:jmap";

type SessionLike = Pick<JmapSession, "accounts">;

export function delegationOf(session: SessionLike | null, accountId: Id | null): Delegation | null {
  if (!session || !accountId) return null;
  const account = session.accounts[accountId];
  if (!account || account.isPersonal) return null;
  const raw = (account.accountCapabilities?.[INBUXA] as { delegation?: Partial<Delegation> } | undefined)?.delegation;
  if (!raw || raw.locked !== true) return null;
  const access: DelegationAccess = raw.access === "organize" || raw.access === "full" ? raw.access : "read";
  return {
    locked: true,
    access,
    sendAs: raw.sendAs === true && access !== "read",
    until: typeof raw.until === "string" ? raw.until : null,
  };
}

/** Every locked account handed to the reader, by name. */
export function delegatedAccounts(session: SessionLike | null): DelegatedAccount[] {
  if (!session) return [];
  return Object.entries(session.accounts)
    .map(([id, account]) => {
      const delegation = delegationOf(session, id);
      return delegation ? { id, name: account.name, delegation } : null;
    })
    .filter((a): a is DelegatedAccount => a !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Whether the reader may change anything in the account (AL-6). */
export function mayWrite(delegation: Delegation | null): boolean {
  return !delegation || delegation.access !== "read";
}

/** Whether the reader may delete in the account (AL-6). */
export function mayDestroy(delegation: Delegation | null): boolean {
  return !delegation || delegation.access === "full";
}
