import { client, INBUXA_CAP } from "@/jmap/client";

/**
 * One tenant's legacy mail protocols switch: INBUXA's
 * `inbuxa:TenantProtocolPolicy` (legacy-protocols LP-9 to LP-18).
 *
 * Turning it off refuses sign-in over IMAP, POP3, ManageSieve and SMTP
 * submission on the tenant's domains, so only this webmail and other JMAP
 * apps work there. It closes no port -- other tenants share them. Turning it
 * back on is refused by the server while the server has legacy protocols off
 * for everyone.
 *
 * Only INBUXA serves it. On any other server the method is unknown, which
 * `fetchTenantLegacy` reports as `null` so the sheet shows nothing.
 */

const OBJECT = "inbuxa:TenantProtocolPolicy";

/** The phrase that turns legacy protocols off (LP-17). Turning them back on needs none. */
export const CONFIRM_PHRASE = "turn off legacy mail";

/** Whether the typed confirmation matches: exactly, no trimming, no case folding. */
export function phraseMatches(typed: string): boolean {
  return typed === CONFIRM_PHRASE;
}

/** One account's last sign-in over one legacy protocol, as the server reports it (LP-15). */
export interface RecentUse {
  accountId: string;
  name: string;
  protocol: string;
  /** Milliseconds since the epoch. */
  lastUsedAt: number;
}

export interface TenantLegacy {
  /** All of IMAP, POP3 and ManageSieve off: the kill-all's state. */
  off: boolean;
  /** When only some are off, which, by name; set one at a time in the console. */
  partlyOff: string[];
  /** Null from a server too old to say who uses legacy apps -- not the same as nobody. */
  recent: RecentUse[] | null;
}

function parseRecent(raw: unknown): RecentUse[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const r = entry as Record<string, unknown>;
    if (typeof r.name !== "string" || typeof r.protocol !== "string" || typeof r.lastUsedAt !== "number") return [];
    return [{ accountId: typeof r.accountId === "string" ? r.accountId : "", name: r.name, protocol: r.protocol, lastUsedAt: r.lastUsedAt }];
  });
}

const PROTOCOL_NAMES: [string, string][] = [["imap", "IMAP"], ["pop3", "POP3"], ["manageSieve", "ManageSieve"]];

export function parseTenantLegacy(raw: Record<string, unknown>): TenantLegacy {
  const off = raw.legacyProtocols === "disabled";
  // An older server sends only legacyProtocols, which stands for all three.
  const partlyOff = off ? [] : PROTOCOL_NAMES.filter(([key]) => raw[key] === "disabled").map(([, name]) => name);
  return { off, partlyOff, recent: parseRecent(raw.recentLegacyUse) };
}

/** The tenant's switch, or null where the server has none (not INBUXA, or too old). */
export async function fetchTenantLegacy(tenantId: string): Promise<TenantLegacy | null> {
  try {
    const res = await client.call<{ list?: Record<string, unknown>[] }>(`${OBJECT}/get`, { ids: [tenantId] }, [INBUXA_CAP]);
    return res.list?.[0] ? parseTenantLegacy(res.list[0]) : null;
  } catch {
    return null;
  }
}

/** Turns the tenant's switch. A refusal (LP-9) comes back as the server's words. */
export async function setTenantLegacy(tenantId: string, off: boolean): Promise<void> {
  const res = await client.call<{ notUpdated?: Record<string, { type: string; description?: string }> | null }>(
    `${OBJECT}/set`,
    { update: { [tenantId]: { legacyProtocols: off ? "disabled" : "enabled" } } },
    [INBUXA_CAP],
  );
  const failed = res.notUpdated?.[tenantId];
  if (failed) throw new Error(failed.description ?? failed.type);
}

const PROTOCOL_ORDER = ["imap", "pop3", "manageSieve", "submission"];
const PROTOCOL_LABELS: Record<string, string> = { imap: "IMAP", pop3: "POP3", manageSieve: "ManageSieve", submission: "SMTP" };

/** One account on the impact panel: every protocol it used, and when it last used any. */
export interface ImpactEntry {
  name: string;
  protocols: string[];
  lastUsedAt: number;
}

/** The impact panel's lines (LP-15): one per account, most recent first. */
export function impactEntries(recent: RecentUse[]): ImpactEntry[] {
  const byAccount = new Map<string, { name: string; protocols: Set<string>; lastUsedAt: number }>();
  for (const use of recent) {
    const key = use.accountId || use.name;
    const entry = byAccount.get(key) ?? { name: use.name, protocols: new Set<string>(), lastUsedAt: 0 };
    entry.protocols.add(use.protocol);
    entry.lastUsedAt = Math.max(entry.lastUsedAt, use.lastUsedAt);
    byAccount.set(key, entry);
  }
  return [...byAccount.values()]
    .map((e) => ({
      name: e.name,
      protocols: [...e.protocols].sort((a, b) => PROTOCOL_ORDER.indexOf(a) - PROTOCOL_ORDER.indexOf(b)).map((p) => PROTOCOL_LABELS[p] ?? p),
      lastUsedAt: e.lastUsedAt,
    }))
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt || a.name.localeCompare(b.name));
}
