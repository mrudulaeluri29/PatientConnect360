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