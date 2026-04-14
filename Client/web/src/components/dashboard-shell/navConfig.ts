import type { DashboardRole, SidebarNavGroup, SidebarNavItem } from "./shellTypes";

export const dashboardNavConfig: Record<DashboardRole, SidebarNavGroup[]> = {
  patient: [
    { id: "patient-home", label: "Home", items: [{ id: "overview", label: "Overview" }] },
    {
      id: "patient-care",
      label: "Care",
      items: [
        { id: "visits", label: "Visits" },
        { id: "medications", label: "Medications" },
        { id: "health", label: "Health" },
        { id: "records", label: "Records", priority: "high" },
        { id: "exercises", label: "Exercises & Tasks" },
      ],
    },
    {
      id: "patient-communication",
      label: "Communication",
      items: [
        { id: "messages", label: "Messages" },
        { id: "notifications", label: "Notifications" },
      ],
    },
    { id: "patient-family", label: "Family & Access", items: [{ id: "family", label: "Family" }] },
  ],
  clinician: [
    {
      id: "clinician-work",
      label: "Clinical Work",
      items: [
        { id: "schedule", label: "Today's Schedule" },
        { id: "patients", label: "Patients" },
        { id: "care-records", label: "Care records", priority: "high" },
        { id: "tasks", label: "Tasks" },
      ],
    },
    {
      id: "clinician-coordination",
      label: "Coordination",
      items: [
        { id: "appointments", label: "Appointments", priority: "high" },
        { id: "messages", label: "Messages" },
        { id: "contact-staff", label: "Contact Staff" },
        { id: "notifications", label: "Notifications" },
      ],
    },
  ],
  caregiver: [
    { id: "caregiver-overview", label: "Overview", items: [{ id: "home", label: "Home" }] },
    {
      id: "caregiver-care",
      label: "Patient Care",
      items: [
        { id: "schedule", label: "Schedule" },
        { id: "medications", label: "Medications" },
        { id: "progress", label: "Progress" },
        { id: "records", label: "Records", priority: "high" },
        { id: "exercises", label: "Exercises & Tasks" },
      ],
    },
    {
      id: "caregiver-comms",
      label: "Communication & Alerts",
      items: [
        { id: "messages", label: "Messages" },
        { id: "alerts", label: "Alerts" },
        { id: "notifications", label: "Notifications" },
        { id: "safety", label: "Safety", priority: "high" },
      ],
    },
    {
      id: "caregiver-access",
      label: "Access & Feedback",
      items: [
        { id: "access", label: "Access", priority: "high" },
        { id: "feedback", label: "Feedback" },
      ],
    },
  ],
  admin: [
    { id: "admin-dashboard", label: "Dashboard", items: [{ id: "overview", label: "Overview" }] },
    {
      id: "admin-people",
      label: "People & Access",
      items: [
        { id: "users", label: "Users" },
        { id: "invitations", label: "Invitations" },
        { id: "assign", label: "Assign Patients" },
      ],
    },
    {
      id: "admin-operations",
      label: "Operations",
      items: [
        { id: "availability", label: "Availability", priority: "high" },
        { id: "appointments", label: "Appointments", priority: "high" },
        { id: "messages", label: "Messages" },
        { id: "notifications", label: "Notifications" },
      ],
    },
    {
      id: "admin-oversight",
      label: "Clinical Oversight",
      items: [
        { id: "records", label: "Patient records", priority: "high" },
        { id: "feedback", label: "Family Feedback" },
      ],
    },
    {
      id: "admin-governance",
      label: "Governance & Insights",
      items: [
        { id: "reports", label: "Reports" },
        { id: "audit", label: "Audit Log", priority: "high" },
        { id: "settings", label: "Settings" },
      ],
    },
  ],
};

export function findActiveNavItem(groups: SidebarNavGroup[], activeItem: string): { item: SidebarNavItem; group: SidebarNavGroup } | null {
  for (const group of groups) {
    const item = group.items.find((candidate) => candidate.id === activeItem);
    if (item) {
      return { item, group };
    }
  }
  return null;
}
