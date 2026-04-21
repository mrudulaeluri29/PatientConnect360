import type { ComponentType, ReactNode } from "react";

type DashboardIcon = ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;

export type DashboardNavItem<T extends string = string> = {
  id: T;
  label: string;
  shortLabel?: string;
  icon: DashboardIcon;
  disabled?: boolean;
};

type DashboardSidebarProps<T extends string> = {
  items: DashboardNavItem<T>[];
  activeItemId: T;
  onSelect: (id: T) => void;
  collapsed: boolean;
  mobileOpen: boolean;
  title: string;
  logo: ReactNode;
  roleLabel: string;
  onCloseMobile: () => void;
};

export function DashboardSidebar<T extends string>({
  items,
  activeItemId,
  onSelect,
  collapsed,
  mobileOpen,
  title,
  logo,
  roleLabel,
  onCloseMobile,
}: DashboardSidebarProps<T>) {
  return (
    <>
      <div
        aria-hidden={!mobileOpen}
        className={`dashboard-shell__backdrop ${mobileOpen ? "is-visible" : ""}`}
        onClick={onCloseMobile}
      />
      <aside
        className={`dashboard-shell__sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
      >
        <div className="dashboard-shell__brand">
          <div className="dashboard-shell__brand-mark">{logo}</div>
          <div className="dashboard-shell__brand-copy">
            <span className="dashboard-shell__brand-kicker">{roleLabel}</span>
            <strong className="dashboard-shell__brand-title">{title}</strong>
          </div>
        </div>

        <nav aria-label={`${roleLabel} navigation`} className="dashboard-shell__nav">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeItemId;
            const label = item.shortLabel || item.label;

            return (
              <button
                key={item.id}
                aria-current={active ? "page" : undefined}
                className={`dashboard-shell__nav-button ${active ? "is-active" : ""}`}
                disabled={item.disabled}
                onClick={() => {
                  onSelect(item.id);
                  onCloseMobile();
                }}
                title={collapsed ? label : undefined}
                type="button"
              >
                <Icon className="dashboard-shell__nav-icon" size={18} strokeWidth={2.1} />
                <span className="dashboard-shell__nav-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
