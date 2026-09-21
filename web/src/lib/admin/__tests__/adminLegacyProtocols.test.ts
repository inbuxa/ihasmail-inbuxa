import { describe, expect, it } from "vitest";
import { CONFIRM_PHRASE, impactEntries, parseTenantLegacy, phraseMatches } from "../adminLegacyProtocols";

describe("a tenant's legacy mail protocols switch, as the server sends it", () => {
  it("reads the switch, and tells an older server from nobody", () => {
    expect(parseTenantLegacy({ legacyProtocols: "disabled", recentLegacyUse: [] })).toEqual({ off: true, recent: [] });
    expect(parseTenantLegacy({ legacyProtocols: "enabled" })).toEqual({ off: false, recent: null });
  });

  it("puts each account on the panel once, with every protocol and its latest use", () => {
    const { recent } = parseTenantLegacy({
      recentLegacyUse: [
        { accountId: "a", name: "maria@acme.example", protocol: "submission", lastUsedAt: 100 },
        { accountId: "a", name: "maria@acme.example", protocol: "imap", lastUsedAt: 300 },
        { accountId: "b", name: "ada@acme.example", protocol: "pop3", lastUsedAt: 200 },
        { accountId: "c", name: "broken" },
      ],
    });
    expect(impactEntries(recent!)).toEqual([
      { name: "maria@acme.example", protocols: ["IMAP", "SMTP"], lastUsedAt: 300 },
      { name: "ada@acme.example", protocols: ["POP3"], lastUsedAt: 200 },
    ]);
  });

  it("takes only the exact phrase", () => {
    expect(phraseMatches(CONFIRM_PHRASE)).toBe(true);
    expect(phraseMatches(` ${CONFIRM_PHRASE}`)).toBe(false);
    expect(phraseMatches(CONFIRM_PHRASE.toUpperCase())).toBe(false);
  });
});
