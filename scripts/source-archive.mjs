/*
 * SPDX-FileCopyrightText: 2026 Coffey Labs
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/*
 * The AGPL's offer, for this build: the exact source it was built from,
 * written next to the app as `source.tar.gz`, and an identity for it that the
 * interface shows beside the download link.
 *
 * In a git checkout, "exact" includes uncommitted work, new files too: every
 * file git doesn't ignore goes into a throwaway index, never the real one, and
 * the tree that makes is what gets archived. The identity is HEAD's short id,
 * with `+local-<tree>` when the tree differs from HEAD's.
 *
 * In the Docker build there is no git (.dockerignore keeps .git out on
 * purpose), so the build context's files are packed as they are, minus what
 * .dockerignore already dropped and what the build made. The identity is then
 * a hash of those files' paths and contents, so the same source always gets
 * the same name.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

const SKIP = new Set(["node_modules", "dist", ".git", "coverage"]);
/** Local state, never source: the session file's folder. */
const SKIP_PATHS = new Set(["server/data"]);

function git(args, cwd, env) {
  return execFileSync("git", args, { cwd, env: env ?? process.env, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function hasGit(root) {
  try {
    return git(["rev-parse", "--is-inside-work-tree"], root) === "true";
  } catch {
    return false;
  }
}

/** Every file that isn't build output, dependencies or local data, sorted. */
function projectFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (SKIP.has(entry.name) || entry.name === "source.tar.gz" || SKIP_PATHS.has(relative(root, full))) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(relative(root, full));
    }
  };
  walk(root);
  return out.sort();
}

/** @returns {{ ref: string | null, id: string }} */
export function sourceIdentity(root) {
  if (hasGit(root)) {
    const dir = mkdtempSync(join(tmpdir(), "inbuxa-source-"));
    try {
      const env = { ...process.env, GIT_INDEX_FILE: join(dir, "index") };
      git(["read-tree", "HEAD"], root, env);
      git(["add", "--all", "."], root, env);
      const tree = git(["write-tree"], root, env);
      const head = git(["rev-parse", "--short=12", "HEAD"], root);
      return tree === git(["rev-parse", "HEAD^{tree}"], root)
        ? { ref: tree, id: head }
        : { ref: tree, id: `${head}+local-${tree.slice(0, 12)}` };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const hash = createHash("sha256");
  for (const file of projectFiles(root)) {
    hash.update(file).update("\0").update(readFileSync(join(root, file))).update("\0");
  }
  return { ref: null, id: `files-${hash.digest("hex").slice(0, 12)}` };
}

/** Write the archive of `identity`'s tree to `outFile`. */
export function writeSourceArchive(root, outFile, name, identity) {
  if (!existsSync(dirname(outFile))) mkdirSync(dirname(outFile), { recursive: true });
  const prefix = `${name}-${identity.id}`;
  if (identity.ref) {
    execFileSync("git", ["archive", "--format=tar.gz", `--prefix=${prefix}/`, "-o", outFile, identity.ref], { cwd: root });
    return;
  }
  // Staged under the prefix and packed from there: BusyBox tar, in the Alpine
  // image, can't rewrite paths as it packs.
  const stage = mkdtempSync(join(tmpdir(), "inbuxa-source-"));
  try {
    for (const file of projectFiles(root)) {
      const to = join(stage, prefix, file);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(join(root, file), to);
    }
    execFileSync("tar", ["-czf", outFile, "-C", stage, prefix]);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
