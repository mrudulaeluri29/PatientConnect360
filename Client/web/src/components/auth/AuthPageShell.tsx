import type { ReactNode } from "react";
import { useAgencyBranding } from "../../branding/AgencyBranding";
import "./AuthPageShell.css";

interface AuthPageShellProps {
  eyebrow?: string;
  title: string;
  description: string;
  highlights?: string[];
  children: ReactNode;
}

export default function AuthPageShell({ eyebrow, title, description, highlights = [], children }: AuthPageShellProps) {
  const { settings } = useAgencyBranding();

  return (
    <div className="auth-page-shell">
      <div className="auth-page-shell__frame">
        <aside className="auth-page-shell__aside">
          <div className="auth-page-shell__brand">
            {settings.logoUrl ? (
              <img className="auth-page-shell__brand-logo" src={settings.logoUrl} alt={settings.portalName} />
            ) : null}
            <div className="auth-page-shell__brand-copy">
              <span className="auth-page-shell__brand-name">{settings.portalName}</span>
              <span className="auth-page-shell__brand-subtitle">Secure care coordination</span>
            </div>
          </div>

          <div className="auth-page-shell__story">
            {eyebrow ? <div className="auth-page-shell__eyebrow">{eyebrow}</div> : null}
            <h1 className="auth-page-shell__title">{title}</h1>
            <p className="auth-page-shell__description">{description}</p>
          </div>

          {highlights.length > 0 ? (
            <div className="auth-page-shell__highlights">
              {highlights.map((highlight) => (
                <div className="auth-page-shell__highlight" key={highlight}>
                  <span className="auth-page-shell__highlight-dot" aria-hidden="true" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="auth-page-shell__support">
            <span className="auth-page-shell__support-label">Support</span>
            <span>{settings.supportName || "Support Team"}</span>
            <span>{[settings.supportEmail, settings.supportPhone].filter(Boolean).join(" • ") || "Help details available after sign-in."}</span>
          </div>
        </aside>

        <main className="auth-page-shell__main">{children}</main>
      </div>
    </div>
  );
}
