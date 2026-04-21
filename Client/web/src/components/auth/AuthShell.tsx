import type { CSSProperties, ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { useAgencyBranding } from "../../branding/AgencyBranding";

type AuthShellTheme = "patient" | "clinician" | "caregiver" | "admin" | "secure";

type Quote = {
  author: string;
  handle: string;
  body: string;
};

type Props = {
  theme?: AuthShellTheme;
  visualKicker: string;
  visualTitle: string;
  visualSubtitle: string;
  visualTags?: string[];
  quote?: Quote;
  utility?: ReactNode;
  children: ReactNode;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AuthShell({
  theme = "secure",
  visualKicker,
  visualTitle,
  visualSubtitle,
  visualTags = [],
  quote,
  utility,
  children,
}: Props) {
  const { settings } = useAgencyBranding();
  const shellVars = {
    "--auth-accent": settings.primaryColor,
  } as CSSProperties;

  return (
    <div className={`auth-stage auth-stage--${theme}`} style={shellVars}>
      <div className={`auth-shell auth-shell--${theme}`}>
        <section className="auth-shell__form-panel">
          <header className="auth-shell__brandline">
            <div className="auth-shell__brand" style={{ viewTransitionName: "auth-brand" }}>
              <span className="auth-shell__brand-mark" aria-hidden="true">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="" className="auth-shell__brand-image" />
                ) : (
                  <ShieldCheck size={18} strokeWidth={2.35} />
                )}
              </span>
              <div className="auth-shell__brand-copy">
                <span className="auth-shell__brand-name">{settings.portalName}</span>
                <span className="auth-shell__brand-caption">Continuity of care, kept in motion</span>
              </div>
            </div>
            {utility ? <div className="auth-shell__utility">{utility}</div> : null}
          </header>

          <div className="auth-shell__content">{children}</div>
        </section>

        <aside className="auth-shell__visual-panel">
          <div className="auth-shell__visual-surface" style={{ viewTransitionName: "auth-visual-surface" }}>
            <div className="auth-shell__visual-noise" aria-hidden="true" />
            <div className="auth-shell__ribbon auth-shell__ribbon--a" aria-hidden="true" />
            <div className="auth-shell__ribbon auth-shell__ribbon--b" aria-hidden="true" />
            <div className="auth-shell__ribbon auth-shell__ribbon--c" aria-hidden="true" />
            <div className="auth-shell__ribbon auth-shell__ribbon--d" aria-hidden="true" />
            <div className="auth-shell__beam auth-shell__beam--a" aria-hidden="true" />
            <div className="auth-shell__beam auth-shell__beam--b" aria-hidden="true" />

            <div className="auth-shell__visual-copy" style={{ viewTransitionName: "auth-visual-copy" }}>
              <p className="auth-shell__visual-kicker">{visualKicker}</p>
              <h1 className="auth-shell__visual-title">{visualTitle}</h1>
              <p className="auth-shell__visual-subtitle">{visualSubtitle}</p>

              {visualTags.length > 0 ? (
                <div className="auth-shell__visual-tags" aria-label="Supported portal roles">
                  {visualTags.map((tag) => (
                    <span className="auth-shell__tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {quote ? (
              <div className="auth-shell__quote" style={{ viewTransitionName: "auth-quote-card" }}>
                <div className="auth-shell__quote-avatar" aria-hidden="true">
                  {initials(quote.author)}
                </div>
                <div className="auth-shell__quote-meta">
                  <p className="auth-shell__quote-author">{quote.author}</p>
                  <p className="auth-shell__quote-handle">{quote.handle}</p>
                </div>
                <p className="auth-shell__quote-body">{quote.body}</p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
