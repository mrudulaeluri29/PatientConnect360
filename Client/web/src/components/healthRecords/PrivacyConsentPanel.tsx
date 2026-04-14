import { useState, useEffect, useCallback } from "react";
import { getMyPrivacySettings, updateMyPrivacySettings, type ApiPrivacySettings } from "../../api/privacy";
import type { RecordsOverviewPrivacy } from "../../api/recordsOverview";

type PatientProps = {
  variant: "patient";
  onPendingChange?: (pending: boolean) => void;
};

type CaregiverProps = {
  variant: "caregiver";
  privacy: RecordsOverviewPrivacy;
};

type Props = PatientProps | CaregiverProps;

export function PrivacyConsentPanel(props: Props) {
  if (props.variant === "caregiver") {
    return <CaregiverPrivacyReadOnly privacy={props.privacy} />;
  }
  return <PatientPrivacyEditor onPendingChange={props.onPendingChange} />;
}

function CaregiverPrivacyReadOnly({ privacy }: { privacy: RecordsOverviewPrivacy }) {
  return (
    <div className="patient-content">
      <div className="overview-card privacy-card f1-records-xp-privacy-readonly">
        <h3 className="card-title">Sharing with you (patient-controlled)</h3>
        <p className="f1-records-xp-muted" style={{ marginTop: 0 }}>
          The patient chooses what you can see on your Records tab. You cannot change these settings — ask them to
          adjust sharing in their portal if something looks missing.
        </p>
        {!privacy.shareDocumentsWithCaregivers ? (
          <div className="f1-privacy-callout f1-privacy-callout--blocked" role="status">
            <strong>Documents:</strong> The patient has turned off document sharing with caregivers. You will not see
            their document list below.
          </div>
        ) : (
          <p className="f1-records-xp-status f1-records-xp-status--ok">
            <strong>Documents:</strong> Shared with linked caregivers
          </p>
        )}
        {!privacy.carePlanVisibleToCaregivers ? (
          <div className="f1-privacy-callout f1-privacy-callout--blocked" role="status">
            <strong>Care plan:</strong> The patient has hidden their care plan from caregivers. Goal and progress
            details below are not available to you.
          </div>
        ) : (
          <p className="f1-records-xp-status f1-records-xp-status--ok">
            <strong>Care plan:</strong> Visible to linked caregivers
          </p>
        )}
        <div className="f1-records-xp-consent-foot">
          <span className="f1-records-xp-muted" style={{ fontSize: "0.85rem" }}>
            {privacy.consentRecordedAt
              ? `Consent last recorded ${new Date(privacy.consentRecordedAt).toLocaleString()}${privacy.consentVersion ? ` · version ${privacy.consentVersion}` : ""}.`
              : "The patient has not recorded consent in the portal yet."}
          </span>
        </div>
      </div>
    </div>
  );
}

function PatientPrivacyEditor({ onPendingChange }: { onPendingChange?: (pending: boolean) => void }) {
  const [settings, setSettings] = useState<ApiPrivacySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pendingConsentMsg, setPendingConsentMsg] = useState("");
  const [privacyChangedSinceConsent, setPrivacyChangedSinceConsent] = useState(false);
  const [consentBaseline, setConsentBaseline] = useState<{
    shareDocumentsWithCaregivers: boolean;
    carePlanVisibleToCaregivers: boolean;
  } | null>(null);

  const refresh = useCallback(() => {
    getMyPrivacySettings()
      .then((s) => {
        setSettings(s);
        const baseline = s.consentRecordedAt
          ? {
              shareDocumentsWithCaregivers: s.shareDocumentsWithCaregivers,
              carePlanVisibleToCaregivers: s.carePlanVisibleToCaregivers,
            }
          : null;
        setConsentBaseline(baseline);
        setPrivacyChangedSinceConsent(false);
        setPendingConsentMsg("");
      })
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    onPendingChange?.(privacyChangedSinceConsent);
  }, [privacyChangedSinceConsent, onPendingChange]);

  const saveToggle = async (
    key: "shareDocumentsWithCaregivers" | "carePlanVisibleToCaregivers",
    value: boolean
  ) => {
    setSaving(true);
    setMsg("");
    try {
      const updated = await updateMyPrivacySettings({ [key]: value });
      setSettings(updated);
      if (updated.consentRecordedAt && consentBaseline) {
        const changed =
          updated.shareDocumentsWithCaregivers !== consentBaseline.shareDocumentsWithCaregivers ||
          updated.carePlanVisibleToCaregivers !== consentBaseline.carePlanVisibleToCaregivers;
        setPrivacyChangedSinceConsent(changed);
        setPendingConsentMsg(changed ? "Please click Re-consent to apply your privacy preference changes." : "");
      } else {
        setPrivacyChangedSinceConsent(false);
        setPendingConsentMsg("");
      }
      setMsg("Privacy settings saved.");
    } catch {
      setMsg("Could not save privacy setting.");
    } finally {
      setSaving(false);
    }
  };

  const recordConsent = async () => {
    setSaving(true);
    setMsg("");
    try {
      const updated = await updateMyPrivacySettings({
        recordConsent: true,
        consentVersion: "feature1-privacy-v1",
      });
      setSettings(updated);
      setConsentBaseline({
        shareDocumentsWithCaregivers: updated.shareDocumentsWithCaregivers,
        carePlanVisibleToCaregivers: updated.carePlanVisibleToCaregivers,
      });
      setPrivacyChangedSinceConsent(false);
      setPendingConsentMsg("");
      setMsg("Consent recorded.");
    } catch {
      setMsg("Could not record consent.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="patient-content">
      <div
        className="overview-card privacy-card"
        onClickCapture={(e) => {
          if (!privacyChangedSinceConsent) return;
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const consentBtn = target.closest("button");
          if (consentBtn && consentBtn.textContent?.toLowerCase().includes("re-consent")) return;
          setPendingConsentMsg("Please click Re-consent to apply your privacy preference changes.");
        }}
      >
        <h3 className="card-title">Privacy &amp; consent</h3>
        {settings ? (
          <>
            <p className="f1-privacy-lead">
              These choices control what your <strong>linked caregivers</strong> see on their Records tab. Changing a
              toggle may require <strong>Re-consent</strong> so we can record that you understand the update.
            </p>
            <label className="privacy-row">
              <input
                type="checkbox"
                checked={settings.shareDocumentsWithCaregivers}
                disabled={saving}
                onChange={(e) => void saveToggle("shareDocumentsWithCaregivers", e.target.checked)}
              />
              <span>
                Share documents with linked caregivers (they can view and download what your care team uploads, unless
                marked hidden)
              </span>
            </label>
            <label className="privacy-row">
              <input
                type="checkbox"
                checked={settings.carePlanVisibleToCaregivers}
                disabled={saving}
                onChange={(e) => void saveToggle("carePlanVisibleToCaregivers", e.target.checked)}
              />
              <span>Let linked caregivers view your care plan (goals, items, and check-ins on Records)</span>
            </label>
            <div className="privacy-consent-row">
              <div className="privacy-consent-meta">
                {settings.consentRecordedAt ? (
                  <>
                    <div className="privacy-consent-label">Last consent</div>
                    <div>
                      {new Date(settings.consentRecordedAt).toLocaleString()}
                      {settings.consentVersion ? (
                        <span className="privacy-consent-version"> · version {settings.consentVersion}</span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="privacy-consent-label">Consent status</div>
                    <div>Not recorded yet — use &quot;I agree&quot; below when you are ready.</div>
                  </>
                )}
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void recordConsent()}
                disabled={saving || (Boolean(settings.consentRecordedAt) && !privacyChangedSinceConsent)}
              >
                {settings.consentRecordedAt ? "Re-consent" : "I agree"}
              </button>
            </div>
            {settings.consentRecordedAt && !privacyChangedSinceConsent ? (
              <p style={{ margin: "0.45rem 0 0", fontSize: "0.82rem", color: "#6b7280" }}>
                Re-consent becomes available after you change a privacy option.
              </p>
            ) : null}
            {privacyChangedSinceConsent ? (
              <p
                className="privacy-warning"
                onClick={() =>
                  setPendingConsentMsg("Please click Re-consent to apply your privacy preference changes.")
                }
              >
                {pendingConsentMsg || "Please click Re-consent to apply your privacy preference changes."}
              </p>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>Could not load privacy settings.</p>
        )}
        {msg ? <p className="privacy-msg">{msg}</p> : null}
      </div>
    </div>
  );
}
