/// <reference types="vite/client" />

/**
 * The build's version string, substituted by Vite at build time — there is no
 * git to ask from inside a browser, or inside the Docker build. See
 * `scripts/version.mjs`.
 */
declare const __IHASMAIL_VERSION__: string;
/** ihasmail-inbuxa: the identity of the source this build was made from (scripts/source-archive.mjs). */
declare const __SOURCE_ID__: string;
