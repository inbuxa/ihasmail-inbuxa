import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { clearNodeCache, mailNode } from "./nodes.js";

/**
 * About names the mail node by the PTR of the address the server's name
 * resolves to from the webmail -- the local node, where a host entry pins it.
 */

beforeEach(() => clearNodeCache());

const lookup = (address: string) => async () => ({ address });

test("the node is named by its address's PTR, without the trailing dot", async () => {
  const n = await mailNode("https://mail.example.com", lookup("192.0.2.2"), async () => ["mx2.example.com."]);
  assert.deepEqual(n, { host: "mail.example.com", address: "192.0.2.2", name: "mx2.example.com" });
});

test("an address without a PTR still shows the address", async () => {
  const n = await mailNode("https://mail.example.com", lookup("192.0.2.3"), async () => { throw new Error("ENOTFOUND"); });
  assert.deepEqual(n, { host: "mail.example.com", address: "192.0.2.3", name: null });
});

test("a name that doesn't resolve says so instead of failing", async () => {
  let reversed = false;
  const n = await mailNode("https://mail.example.com", async () => { throw new Error("ENOTFOUND"); }, async () => { reversed = true; return []; });
  assert.deepEqual(n, { host: "mail.example.com", address: null, name: null });
  assert.equal(reversed, false);
});

test("the answer is cached for a minute, then looked up again", async () => {
  let calls = 0;
  const count = async () => { calls++; return { address: "192.0.2.1" }; };
  const rev = async () => ["mail.example.com"];
  await mailNode("https://mail.example.com", count, rev, 0);
  await mailNode("https://mail.example.com", count, rev, 59_000);
  assert.equal(calls, 1);
  await mailNode("https://mail.example.com", count, rev, 61_000);
  assert.equal(calls, 2);
});
