import { useSession } from "@/store/session";
import { withBase } from "@/lib/basePath";

/**
 * What this instance calls itself, when nothing has said otherwise yet.
 *
 * `APP_NAME` is a runtime environment variable, so the real answer arrives
 * from the server -- on `/api/config` before anybody signs in, and on the
 * session afterwards. This is what stands in until it does, and what stands
 * for good if the request fails: a sign-in form with no name on it would be
 * worse than one with the wrong name.
 *
 * One constant rather than the string written out at each of them, because
 * three copies of a default is how two of them end up stale.
 */
// ihasmail-inbuxa: inbuxa's webmail goes by inbuxa, so it can't be taken for
// public ihasmail. APP_NAME still names a deployment whatever it likes.
export const DEFAULT_APP_NAME = "inbuxa";
/**
 * What this instance calls itself, right now.
 *
 * Text that names the app reads it from here rather than writing "ihasmail"
 * into the sentence, so an instance renamed with `APP_NAME` is called by its
 * name everywhere, not only on the sign-in page and in the title bar. The
 * name goes into the sentence as the `{app}` placeholder, which also lets a
 * translator put it where their language wants it.
 *
 * Two shapes for the same fact: the hook for components, and the plain
 * function for the few places that build strings outside React (the service
 * worker's facts, for one). Both fall back to the default until the session
 * arrives.
 */
export function useAppName(): string {
  return useSession((s) => s.session?.ihasmail?.appName)?.trim() || DEFAULT_APP_NAME;
}

export function currentAppName(): string {
  return useSession.getState().session?.ihasmail?.appName?.trim() || DEFAULT_APP_NAME;
}

/**
 * The brand images' version, carried as `?v=` on every URL that names one.
 *
 * The images live in `public/img` under fixed names and are served with a
 * browser cache of hours, so replacing one (the mark changed on 2026-09-27)
 * left returning visitors on the old picture until their copy expired -- and
 * the favicon and an installed app's icon hold on longer still. A new value
 * here is a new URL everywhere at once.
 *
 * Date-stamped with a letter for a second change the same day, never a
 * counter, for the reason the sites give for ASSET_V: a value that could have
 * been requested before may already be cached, with old bytes behind it.
 * `index.html`, `public/manifest.webmanifest` and `public/sw.js` can't import
 * this, so they carry the same value written out; keep the four in step.
 */
export const BRAND_V = "2026-09-27a";

/** A brand image's URL under the mount, versioned: `brandImage("/img/logo.png")`. */
export function brandImage(path: string): string {
  return withBase(`${path}?v=${BRAND_V}`);
}
