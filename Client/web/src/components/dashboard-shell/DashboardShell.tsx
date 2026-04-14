import { useState } from "react";
import { useAgencyBranding } from "../../branding/AgencyBranding";
import ShellHeader from "./ShellHeader";
import SidebarNav from "./SidebarNav";
import { findActiveNavItem } from "./navConfig";
import type { DashboardShellProps } from "./shellTypes";
import "./DashboardShell.css";

export default function DashboardShell({
  role,
  className = "",
  navGroups,
  activeItem,
  onSelectItem,
  onLogout,
  onNotificationMessageClick,
  userName,
  roleLabel,
  banner,
  secondaryAside,
  fullWidthContent = false,
  children,
}: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { settings } = useAgencyBranding();
  const activeNav = findActiveNavItem(navGroups, activeItem);

  const handleSelectItem = (itemId: string) => {
    onSelectItem(itemId);
    setMobileNavOpen(false);
  };

  return (
    <div className={["dashboard-shell", `dashboard-shell--${role}`, className].filter(Boolean).join(" ")}>
      <aside className="dashboard-shell__sidebar">
        <div className="dashboard-shell__brand">
          {settings.logoUrl ? <img className="dashboard-shell__brand-logo" src={settings.logoUrl} alt={settings.portalName} /> : null}
          <div className="dashboard-shell__brand-copy">
            <span className="dashboard-shell__brand-name">{settings.portalName}</span>
            <span className="dashboard-shell__brand-subtitle">Care coordination workspace</span>
          </div>
        </div>
        <SidebarNav navGroups={navGroups} activeItem={activeItem} onSelectItem={handleSelectItem} />
      </aside>

      <div className="dashboard-shell__viewport">
        <ShellHeader
          sectionGroupLabel={activeNav?.group.label}
          sectionTitle={activeNav?.item.label ?? roleLabel}
          userName={userName}
          roleLabel={roleLabel}
          onLogout={onLogout}
          onNotificationMessageClick={onNotificationMessageClick}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <div className={`dashboard-shell__body ${fullWidthContent ? "dashboard-shell__body--full-width" : ""}`}>
          <div className="dashboard-shell__content">
            {banner ? <div className="dashboard-shell__banner">{banner}</div> : null}
            {children}
          </div>
          {!fullWidthContent && secondaryAside ? <aside className="dashboard-shell__aside">{secondaryAside}</aside> : null}
        </div>
      </div>

      <div className={`dashboard-shell__mobile-backdrop ${mobileNavOpen ? "is-open" : ""}`} onClick={() => setMobileNavOpen(false)} />
      <aside className={`dashboard-shell__mobile-drawer ${mobileNavOpen ? "is-open" : ""}`} aria-hidden={!mobileNavOpen}>
        <div className="dashboard-shell__mobile-drawer-header">
          <div className="dashboard-shell__brand">
            {settings.logoUrl ? <img className="dashboard-shell__brand-logo" src={settings.logoUrl} alt={settings.portalName} /> : null}
            <div className="dashboard-shell__brand-copy">
              <span className="dashboard-shell__brand-name">{settings.portalName}</span>
              <span className="dashboard-shell__brand-subtitle">Care coordination workspace</span>
            </div>
          </div>
          <button type="button" className="dashboard-shell__mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation menu">
            ×
          </button>
        </div>
        <SidebarNav navGroups={navGroups} activeItem={activeItem} onSelectItem={handleSelectItem} />
      </aside>
    </div>
  );
}
