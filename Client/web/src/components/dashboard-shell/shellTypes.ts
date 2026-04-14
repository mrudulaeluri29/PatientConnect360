import type { ReactNode } from "react";

export type DashboardRole = "patient" | "clinician" | "caregiver" | "admin";

export interface SidebarNavItem {
  id: string;
  label: string;
  priority?: "default" | "high";
}

export interface SidebarNavGroup {
  id: string;
  label: string;
  items: SidebarNavItem[];
}

export interface DashboardShellProps {
  role: DashboardRole;
  className?: string;
  navGroups: SidebarNavGroup[];
  activeItem: string;
  onSelectItem: (itemId: string) => void;
  onLogout: () => void | Promise<void>;
  onNotificationMessageClick?: (view: string, conversationId?: string, messageId?: string) => void;
  userName: string;
  roleLabel: string;
  banner?: ReactNode;
  secondaryAside?: ReactNode;
  fullWidthContent?: boolean;
  children: ReactNode;
}
