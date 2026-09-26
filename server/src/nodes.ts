/**
 * ihasmail-inbuxa: which webmail node answered, and which inbuxa node it talks
 * to -- shown in Settings > About, for troubleshooting a cluster.
 *
 * Not for upstream ihasmail: it only makes sense where one webmail runs per
 * host, each pinned to its own host's mail node.
 *
 * The webmail node is NODE_NAME, set per host by the deploy; without it, the
 * container's hostname, which is at least distinct. The mail node is worked
 * out from the address the server's name resolves to *here*, where the host
 * entry pins it to the local node, named by that address's PTR record (every
 * node has one: mail/mx2/mx3). The server offers its node name only to
 * administrators, so asking it would leave everyone else with nothing.
 */
import { lookup as dnsLookup, resolvePtr } from "node:dns/promises";
import { isIPv4 } from "node:net";
import { hostname } from "node:os";
import { config } from "./config.js";

export interface MailNode {
  /** The server name the webmail connects to, from its configured URL. */
  host: string;
  /** What that name resolves to from this container, or null if it doesn't. */
  address: string | null;
  /** The address's PTR name: the node's own name. Null without a PTR. */
  name: string | null;
}

export interface Nodes {
  webmail: string;
  mailServer: MailNode;
}

type Lookup = (host: string) => Promise<{ address: string }>;
type Reverse = (address: string) => Promise<string[]>;

/**
 * The reverse-lookup name for an address: 1.2.0.192.in-addr.arpa, or the
 * nibble form under ip6.arpa. Asked for directly, because `dns.reverse` came
 * back empty in the image while the resolver answered the PTR (2026-09-26).
 */
export function ptrName(address: string): string {
  if (isIPv4(address)) return `${address.split(".").reverse().join(".")}.in-addr.arpa`;
  const [head = "", tail = ""] = address.split("::");
  const groups = (part: string) => (part ? part.split(":") : []);
  const h = groups(head), t = groups(tail);
  const full = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  return `${full.map((g) => g.padStart(4, "0")).join("").split("").reverse().join(".")}.ip6.arpa`;
}

const dnsReverse: Reverse = (address) => resolvePtr(ptrName(address));

const CACHE_MS = 60_000;
const cache = new Map<string, { node: MailNode; at: number }>();

export function webmailNode(): string {
  return config.nodeName || hostname();
}

export async function mailNode(base: string, lookup: Lookup = dnsLookup, reverse: Reverse = dnsReverse, now = Date.now()): Promise<MailNode> {
  const host = new URL(base).hostname;
  const hit = cache.get(host);
  if (hit && now - hit.at < CACHE_MS) return hit.node;
  let address: string | null = null;
  let name: string | null = null;
  try {
    address = (await lookup(host)).address;
  } catch {
    /* unresolvable: say so rather than fail the page */
  }
  if (address) {
    try {
      name = (await reverse(address))[0]?.replace(/\.$/, "") ?? null;
    } catch {
      /* no PTR */
    }
  }
  const node = { host, address, name };
  cache.set(host, { node, at: now });
  return node;
}

export function clearNodeCache(): void {
  cache.clear();
}
