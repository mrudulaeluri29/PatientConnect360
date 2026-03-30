// Legacy mock shape — kept for backward compatibility.
// New code should use ApiVisit from src/api/visits.ts
export interface Visit {
  id: string;
  date: string;
  time: string;
  clinician: {
    name: string;
    discipline: string;
    avatar: string;
  };
  purpose: string;
  status: "Scheduled" | "Confirmed" | "Pending" | "Rescheduled" | "Cancelled";
  address: string;
}
