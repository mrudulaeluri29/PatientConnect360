import type { ReactNode } from "react";
import { ChevronLeft, Menu } from "lucide-react";

type DashboardUtilityBarProps = {
  currentSectionLabel: string;
  roleLabel: string;
  userName: string;
  userBadge: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
  onLogout: () => void;
  utilitySlot?: ReactNode;
};

export function DashboardUtilityBar({
  currentSectionLabel,
  roleLabel,
  userName,
  userBadge,
  collapsed,
  onToggleCollapse,
  onOpenMobile,
  onLogout,
  utilitySlot,
}: DashboardUtilityBarProps) {
  return (
    <div className="dashboard-shell__utility-bar">
      <div className="dashboard-shell__utility-left">
        <button
          aria-label="Open navigation menu"
          className="dashboard-shell__icon-button dashboard-shell__mobile-toggle"
          onClick={onOpenMobile}
          type="button"
        >
          <Menu size={18} strokeWidth={2.1} />
        </button>

        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="dashboard-shell__icon-button dashboard-shell__collapse-toggle"
          onClick={onToggleCollapse}
          type="button"
        >
          <ChevronLeft className={collapsed ? "is-collapsed" : ""} size={18} strokeWidth={2.1} />
        </button>

        <div className="dashboard-shell__section-copy">
          <span className="dashboard-shell__section-kicker">{roleLabel}</span>
          <h1 className="dashboard-shell__section-title">{currentSectionLabel}</h1>
        </div>
      </div>

      <div className="dashboard-shell__utility-right">
        {utilitySlot ? <div className="dashboard-shell__utility-slot">{utilitySlot}</div> : null}
        <div className="dashboard-shell__user-panel">
          <span className="dashboard-shell__user-name">{userName}</span>
          <span className="dashboard-shell__user-badge">{userBadge}</span>
        </div>
        <button className="dashboard-shell__logout" onClick={onLogout} type="button">
          Logout
        </button>
      </div>
    </div>
  );
}
