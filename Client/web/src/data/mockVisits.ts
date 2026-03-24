import type { Visit } from "../types/visit";

export const mockVisits: Visit[] = [
  {
    id: "1",
    date: "Tomorrow",
    time: "10:00 AM",
    clinician: {
      name: "Dr. Sarah Johnson",
      discipline: "Wound Care Specialist",
      avatar: "SJ",
    },
    purpose: "Wound Care Follow-Up",
    status: "Scheduled",
    address: "123 Main St, Phoenix, AZ 85001",
  },
  {
    id: "2",
    date: "Friday, Jan 26",
    time: "2:00 PM",
    clinician: {
      name: "Nurse Mary Smith",
      discipline: "Physical Therapy",
      avatar: "MS",
    },
    purpose: "Physical Therapy Session",
    status: "Scheduled",
    address: "123 Main St, Phoenix, AZ 85001",
  },
  {
    id: "3",
    date: "Monday, Jan 29",
    time: "11:00 AM",
    clinician: {
      name: "Dr. David Williams",
      discipline: "Primary Care",
      avatar: "DW",
    },
    purpose: "Routine Check-Up",
    status: "Scheduled",
    address: "123 Main St, Phoenix, AZ 85001",
  },
];