import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { useAgencyBranding } from "../../branding/AgencyBranding";
import { DashboardSidebar, type DashboardNavItem } from "./DashboardSidebar";
import { DashboardUtilityBar } from "./DashboardUtilityBar";
import "./DashboardShell.css";

type DashboardShellProps<T extends string> = {
  shellId: string;
  className?: string;
  roleLabel: string;
  userName: string;
  userBadge: string;
  accentColor: string;
  navItems: DashboardNavItem<T>[];
  activeItemId: T;
  onSelectItem: (id: T) => void;
  onLogout: () => void;
  utilitySlot?: ReactNode;
  children: ReactNode;
};

const DESKTOP_BREAKPOINT = 1024;

export default function DashboardShell<T extends string>({
  shellId,
  className,
  roleLabel,
  userName,
  userBadge,
  accentColor,
  navItems,
  activeItemId,
  onSelectItem,
  onLogout,
  utilitySlot,
  children,
}: DashboardShellProps<T>) {
  const { settings } = useAgencyBranding();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`dashboard-shell:${shellId}:collapsed`);
      if (stored) {
        setCollapsed(stored === "true");
      }
    } catch {
      // Ignore unavailable storage and fall back to default expanded state.
    }
  }, [shellId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`dashboard-shell:${shellId}:collapsed`, String(collapsed));
    } catch {
      // Ignore unavailable storage.
    }
  }, [collapsed, shellId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    const onResize = () => {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const activeItem = useMemo(
    () => navItems.find((item) => item.id === activeItemId) ?? navItems[0],
    [activeItemId, navItems],
  );

  const logo = settings.logoUrl ? (
    <img alt={settings.portalName} className="dashboard-shell__brand-image" src={settings.logoUrl} />
  ) : (
    <Building2 size={20} strokeWidth={2.2} />
  );

  return (
    <div
      className={`dashboard-shell ${className ?? ""}`.trim()}
      style={{ ["--dashboard-accent" as string]: accentColor, ["--dashboard-brand" as string]: settings.primaryColor }}
    >
      <DashboardSidebar
        activeItemId={activeItemId}
        collapsed={collapsed}
        items={navItems}
        logo={logo}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onSelect={onSelectItem}
        roleLabel={roleLabel}
        title={settings.portalName}
      />

      <div className="dashboard-shell__main">
        <DashboardUtilityBar
          collapsed={collapsed}
          currentSectionLabel={activeItem?.label ?? roleLabel}
          onLogout={onLogout}
          onOpenMobile={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed((current) => !current)}
          roleLabel={roleLabel}
          userBadge={userBadge}
          userName={userName}
          utilitySlot={utilitySlot}
        />
        <div className="dashboard-shell__content">{children}</div>
      </div>
    </div>
  );
}
