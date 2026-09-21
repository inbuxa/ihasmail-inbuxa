import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/store/session";
import type { JmapSession } from "@/jmap/types";
import type { TenantLegacy } from "@/lib/admin/adminLegacyProtocols";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({
  state: null as TenantLegacy | null,
  set: vi.fn(async () => {}),
}));
vi.mock("@/lib/admin/adminLegacyProtocols", async (original) => ({
  ...(await original<typeof import("@/lib/admin/adminLegacyProtocols")>()),
  fetchTenantLegacy: vi.fn(async () => api.state),
  setTenantLegacy: api.set,
}));

const { TenantLegacyProtocols } = await import("../TenantLegacyProtocols");

const signIn = (permissions: string[]) =>
  useSession.setState({ session: { capabilities: {}, accounts: {}, primaryAccounts: {}, username: "a@example.com", ihasmail: { permissions } } as unknown as JmapSession });
const button = (host: HTMLElement, label: string) => [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === label);
const type = async (el: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

/**
 * INBUXA legacy-protocols at tenant scope: nobody turns it off by accident
 * (the statement and a typed phrase first), and turning it back on is one
 * click.
 */
describe("a tenant's legacy mail protocols switch", () => {
  let host: HTMLDivElement;
  let root: Root;
  const render = async () => {
    await act(async () => {
      root.render(<TenantLegacyProtocols tenantId="t1" tenantName="Acme Corp" />);
    });
    await act(async () => {});
  };
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    api.set.mockClear();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it("isn't there on a server without the switch", async () => {
    api.state = null;
    signIn(["sysDomainGet", "sysDomainUpdate"]);
    await render();
    expect(host.textContent).toBe("");
  });

  it("shows who would notice and what it means, then asks for the exact phrase", async () => {
    api.state = { off: false, recent: [{ accountId: "a", name: "maria@acme.example", protocol: "imap", lastUsedAt: Date.now() - 2 * 86400_000 }] };
    signIn(["sysDomainGet", "sysDomainUpdate"]);
    await render();
    await act(async () => button(host, "Turn off legacy protocols…")!.click());

    expect(host.textContent).toContain("1 account used a legacy mail app in the last 30 days.");
    expect(host.textContent).toContain("maria@acme.example: IMAP");
    expect(host.textContent).toContain("turned off for everyone in Acme Corp");
    // A tenant's switch closes no port, so the statement names none.
    expect(host.textContent).not.toContain("firewall");

    const confirm = button(host, "Turn off legacy protocols")!;
    const box = host.querySelector<HTMLInputElement>("#admin-legacy-confirm")!;
    await type(box, "Turn off legacy mail");
    expect(confirm.disabled).toBe(true);
    await type(box, "turn off legacy mail");
    expect(confirm.disabled).toBe(false);
    await act(async () => confirm.click());
    expect(api.set).toHaveBeenCalledWith("t1", true);
  });

  it("turns it back on with one click", async () => {
    api.state = { off: true, recent: [] };
    signIn(["sysDomainGet", "sysDomainUpdate"]);
    await render();
    await act(async () => button(host, "Turn legacy protocols back on")!.click());
    expect(api.set).toHaveBeenCalledWith("t1", false);
  });

  it("shows the state but no switch to someone who can't change domains", async () => {
    api.state = { off: true, recent: null };
    signIn(["sysDomainGet"]);
    await render();
    expect(host.textContent).toContain("Off for Acme Corp");
    expect(host.querySelector("button")).toBeNull();
  });
});
