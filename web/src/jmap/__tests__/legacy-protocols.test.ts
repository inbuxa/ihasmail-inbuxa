import { describe, expect, it } from "vitest";
import { INBUXA_CAP, legacyProtocolsOff } from "../client";
import type { JmapSession } from "../types";

/**
 * The server says, per account, whether legacy mail protocols are off for it
 * (legacy-protocols LP-19, contract C-1). Anything short of a plain
 * "disabled" -- an older server, another server, no session yet -- reads as
 * on, so the notice never appears where it isn't true.
 */
describe("legacyProtocolsOff", () => {
  const session = (cap: Record<string, unknown> | undefined) =>
    ({
      accounts: { a: { name: "u@example.org", accountCapabilities: cap ? { [INBUXA_CAP]: cap } : {} } },
    }) as unknown as JmapSession;

  it("is on only when the account's capability says disabled", () => {
    expect(legacyProtocolsOff(session({ legacyProtocols: "disabled" }), "a")).toBe(true);
    expect(legacyProtocolsOff(session({ legacyProtocols: "enabled" }), "a")).toBe(false);
  });

  it("reads an older or other server, or no session, as on", () => {
    expect(legacyProtocolsOff(session({ logo: null }), "a")).toBe(false);
    expect(legacyProtocolsOff(session(undefined), "a")).toBe(false);
    expect(legacyProtocolsOff(session({ legacyProtocols: "disabled" }), "b")).toBe(false);
    expect(legacyProtocolsOff(null, "a")).toBe(false);
    expect(legacyProtocolsOff(session({ legacyProtocols: "disabled" }), null)).toBe(false);
  });
});
