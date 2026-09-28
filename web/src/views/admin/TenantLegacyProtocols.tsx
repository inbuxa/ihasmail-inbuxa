import { useEffect, useState } from "react";
import { useAppName } from "@/lib/brand";
import { can } from "@/lib/admin/adminAccess";
import {
  CONFIRM_PHRASE,
  fetchTenantLegacy,
  impactEntries,
  phraseMatches,
  setTenantLegacy,
  type TenantLegacy,
} from "@/lib/admin/adminLegacyProtocols";
import { formatRelative } from "@/lib/format";
import { plural, t, tNode } from "@/lib/i18n";
import { toast } from "@/ui/toast";
import { usePermissions } from "./usePermissions";

/**
 * A tenant's legacy mail protocols switch, in its sheet (INBUXA
 * legacy-protocols LP-9 to LP-17, at tenant scope).
 *
 * Nobody should turn it on by accident or without understanding it: turning
 * it off shows who would notice (LP-15) and what it means (LP-16) before the
 * typed phrase is asked for (LP-17). Turning it back on is one click -- undoing
 * a restriction must never be the hard part. A tenant's switch closes no port,
 * so the statement names none.
 *
 * Only INBUXA has it; on any other server the section isn't there.
 */
export function TenantLegacyProtocols({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const perms = usePermissions();
  const app = useAppName();
  const canChange = can(perms, "Domain", "Update");
  const [state, setState] = useState<TenantLegacy | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let canceled = false;
    void fetchTenantLegacy(tenantId).then((s) => !canceled && setState(s));
    return () => {
      canceled = true;
    };
  }, [tenantId, revision]);

  if (!state) return null;

  const turn = async (off: boolean) => {
    setBusy(true);
    try {
      await setTenantLegacy(tenantId, off);
      setConfirming(false);
      setTyped("");
      setRevision((r) => r + 1);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const entries = state.recent ? impactEntries(state.recent) : null;

  return (
    <>
      <h3>{t("Legacy mail apps")}</h3>
      <p>
        {state.off
          ? t("Off for {tenant}. Only {app} and JMAP apps can sign in to its domains.", { tenant: tenantName, app })
          : state.partlyOff.length > 0
            ? t("Some are off for {tenant}: {protocols}. Switch them one at a time in the administration console.", {
                tenant: tenantName,
                protocols: state.partlyOff.join(", "),
              })
            : t("On for {tenant}. Mail apps can use IMAP, POP3 and ManageSieve on its domains.", { tenant: tenantName })}
      </p>

      {canChange && (state.off || state.partlyOff.length > 0) && (
        <button className="btn" disabled={busy} onClick={() => void turn(false)}>
          {t("Turn legacy protocols back on")}
        </button>
      )}
      {canChange && !state.off && !confirming && (
        <button className="btn btn-danger" onClick={() => setConfirming(true)}>
          {t("Turn off legacy protocols…")}
        </button>
      )}

      {!state.off && confirming && (
        <div className="admin-legacy-confirm">
          {entries &&
            (entries.length === 0 ? (
              <p className="hint">{t("No account used a legacy mail app in the last 30 days.")}</p>
            ) : (
              <div className="admin-legacy-box">
                <p>
                  <b>
                    {plural(entries.length, {
                      one: "{n} account used a legacy mail app in the last 30 days.",
                      other: "{n} accounts used a legacy mail app in the last 30 days.",
                    }, { n: entries.length })}
                  </b>{" "}
                  {t("Their mail apps will stop working the moment you turn this on:")}
                </p>
                <ul>
                  {entries.map((e) => (
                    <li key={e.name}>
                      <span className="notranslate" translate="no">{e.name}</span>: {e.protocols.join(", ")},{" "}
                      {formatRelative(new Date(e.lastUsedAt).toISOString())}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          <div className="admin-legacy-box warn">
            <p><b>{t("Only {app} and JMAP apps will work.", { app })}</b></p>
            <p>
              {t("Legacy mail protocols (IMAP, POP3, ManageSieve and sending from mail apps) will be turned off for everyone in {tenant}.", { tenant: tenantName })}
            </p>
            <ul>
              <li>{t("Phone and desktop mail apps will stop receiving and sending mail. That's iPhone and iPad Mail, the Gmail and Outlook apps, Outlook, Thunderbird and Apple Mail. People will see sign-in errors in them.")}</li>
              <li>{t("Filters managed from a mail app (ManageSieve) will stop working. Filters set in {app} keep working.", { app })}</li>
              <li>{t("Incoming mail is not affected. Calendars and contacts are not affected.")}</li>
              <li>{t("People keep full access through {app}, which can be installed as an app on phones and computers.", { app })}</li>
            </ul>
            <p>{t("Sending from mail apps (SMTP submission) will stop working, but its ports stay open: mail apps will be told they cannot sign in. Incoming mail (SMTP) and {app} (JMAP) are not affected and cannot be turned off here.", { app })}</p>
            <p>{t("You can turn legacy protocols back on at any time.")}</p>
          </div>

          <div className="field">
            <label htmlFor="admin-legacy-confirm">
              {tNode("To confirm, type {phrase}", { phrase: <code>{CONFIRM_PHRASE}</code> })}
            </label>
            <input
              id="admin-legacy-confirm"
              className="input"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          <div className="row gap-8">
            <button className="btn btn-danger" disabled={busy || !phraseMatches(typed)} onClick={() => void turn(true)}>
              {t("Turn off legacy protocols")}
            </button>
            <button className="btn" disabled={busy} onClick={() => { setConfirming(false); setTyped(""); }}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
