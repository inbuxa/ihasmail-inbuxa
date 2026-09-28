import { describe, expect, it } from "vitest";
import { INBUXA_CAP, legacyProtocolsPartlyOff } from "../client";
import { parseTenantLegacy } from "@/lib/admin/adminLegacyProtocols";
import type { JmapSession } from "../types";

/**
 * INBUXA can switch IMAP, POP3 and ManageSieve off one at a time. The session
 * lists what is still allowed (`legacyAllowed`); the webmail names what isn't,
 * only while some but not all are off, and never from a server that doesn't
 * say.
 */
describe("legacyProtocolsPartlyOff", () => {
  const session = (cap: Record<string, unknown> | undefined) =>
    ({
      accounts: { a: { name: "u@example.org", accountCapabilities: cap ? { [INBUXA_CAP]: cap } : {} } },
    }) as unknown as JmapSession;

  it("names what is off when only some are", () => {
    const s = session({ legacyProtocols: "enabled", legacyAllowed: ["imap", "manageSieve", "submission"] });
    expect(legacyProtocolsPartlyOff(s, "a")).toEqual(["POP3"]);
    const two = session({ legacyProtocols: "enabled", legacyAllowed: ["pop3", "submission"] });
    expect(legacyProtocolsPartlyOff(two, "a")).toEqual(["IMAP", "ManageSieve"]);
  });

  it("is empty with none off, all off, or an older server", () => {
    const all = ["imap", "pop3", "manageSieve", "submission"];
    expect(legacyProtocolsPartlyOff(session({ legacyProtocols: "enabled", legacyAllowed: all }), "a")).toEqual([]);
    expect(legacyProtocolsPartlyOff(session({ legacyProtocols: "disabled", legacyAllowed: [] }), "a")).toEqual([]);
    expect(legacyProtocolsPartlyOff(session({ legacyProtocols: "enabled" }), "a")).toEqual([]);
    expect(legacyProtocolsPartlyOff(null, "a")).toEqual([]);
  });
});

describe("parseTenantLegacy", () => {
  it("reads a tenant with only some off, and an older server's one switch", () => {
    expect(parseTenantLegacy({ legacyProtocols: "enabled", pop3: "disabled" }).partlyOff).toEqual(["POP3"]);
    const all = parseTenantLegacy({ legacyProtocols: "disabled", imap: "disabled", pop3: "disabled" });
    expect(all.off).toBe(true);
    expect(all.partlyOff).toEqual([]);
    expect(parseTenantLegacy({ legacyProtocols: "enabled" }).partlyOff).toEqual([]);
  });
});
