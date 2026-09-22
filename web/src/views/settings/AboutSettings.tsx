import { useSession } from "@/store/session";
import { useAppName } from "@/lib/brand";
import { client } from "@/jmap/client";
import { APP_VERSION } from "@/lib/version";
import { DEFAULT_SOURCE_URL } from "@/lib/source";
import { withBase } from "@/lib/basePath";
import { t, tNode } from "@/lib/i18n";
import { InbuxaWordmark } from "@/ui/InbuxaWordmark";

export function AboutSettings() {
  const appName = useAppName();
  const session = useSession((s) => s.session);
  const caps = Object.keys(session?.capabilities ?? {});
  // A deployment running modified code should offer its own source, not ours.
  const sourceUrl = session?.ihasmail?.sourceUrl ?? DEFAULT_SOURCE_URL;
  return (
    <div>
      {/* ihasmail-inbuxa: INBUXA's webmail, built on ihasmail. The version and
          source are this build's, the AGPL's offer; ihasmail keeps its credit.
          The name comes from APP_NAME now, so a renamed deployment is named
          here too. */}
      <h1>{t("About {app}", { app: appName })}</h1>
      <p className="lead">{tNode("A fast, friendly, open-source webmail for {server}, built on JMAP.", { server: <span className="notranslate" translate="no">{appName}</span> })}</p>
      <div className="row" style={{ gap: 16, alignItems: "center", marginBottom: 16 }}>
        <img src={withBase("/img/inbuxa-mark.png")} alt="" width={80} />
        <div>
          <InbuxaWordmark height={26} />
          {/* A product name and a version string: neither is a word to translate. */}
          <div style={{ fontWeight: 700 }} className="notranslate" translate="no">{appName} webmail v{APP_VERSION}</div>
          <div className="hint">{tNode("Built on {project}", { project: <a href="https://ihasmail.org" target="_blank" rel="noopener noreferrer" className="notranslate" translate="no">ihasmail</a> })}</div>
          <div className="hint">{tNode("AGPL-3.0-or-later · {source}", { source: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="notranslate" translate="no">{sourceUrl.replace(/^https?:\/\//, "")}</a> })}</div>
        </div>
      </div>
      <h2>{t("Server")}</h2>
      <table className="sessions-table">
        <tbody>
          <tr><td>{t("Signed in as")}</td><td>{session?.username}</td></tr>
          <tr><td>{t("Mail server")}</td><td className="notranslate" translate="no">inbuxa</td></tr>
          <tr><td>{t("Accounts")}</td><td>{Object.values(session?.accounts ?? {}).map((a) => a.name).join(", ")}</td></tr>
          <tr><td>{t("Max upload")}</td><td>{t("{size} MB", { size: Math.round(client.maxSizeUpload / 1048576) })}</td></tr>
          <tr><td>{t("Image privacy proxy")}</td><td>{session?.ihasmail?.imageProxy ? t("enabled") : t("disabled")}</td></tr>
        </tbody>
      </table>
      <p className="hint" style={{ marginTop: 6 }}>{t("This webmail works with the inbuxa mail server, and sign-in refuses a server that doesn't offer what it needs.")}</p>
      <p className="hint">{tNode("{app}'s own version is the date of the commit it was built from, followed by where that commit came from: {example} was built from a commit dated the 30th of August 2026 that arrived through pull request 129. A commit that did not come through one carries its short SHA instead — {sha}. The version deliberately says nothing about the mail server; what this build needs from the server is the line above.", { example: <strong className="notranslate" translate="no">v2026.8.30+pr129</strong>, sha: <code>+g1fa6578</code> }, { app: appName })}</p>
      <h2>{t("Server capabilities")}</h2>
      <div className="row wrap gap-4">
        {caps.map((c) => <span key={c} className="chip mono" style={{ fontSize: ".78em" }}>{c.replace("urn:ietf:params:jmap:", "")}</span>)}
      </div>
    </div>
  );
}
