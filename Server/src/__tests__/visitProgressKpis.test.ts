import { VisitStatus } from "@prisma/client";
import {
  countCompletedVisitsInRollingWindow,
  countMissedVisitsInRollingWindow,
  countUpcomingVisits,
} from "../lib/visitProgressKpis";

const now = new Date("2026-04-15T12:00:00.000Z");

describe("visitProgressKpis", () => {
  it("matches patient portal: counts open visits (not terminal), including past-due still open", () => {
    const visits = [
      { status: VisitStatus.SCHEDULED, scheduledAt: new Date("2026-04-20T10:00:00.000Z") },
      { status: VisitStatus.CONFIRMED, scheduledAt: new Date("2026-04-08T10:00:00.000Z") },
      { status: VisitStatus.REQUESTED, scheduledAt: new Date("2026-04-01T10:00:00.000Z") },
      { status: VisitStatus.IN_PROGRESS, scheduledAt: new Date("2026-04-10T10:00:00.000Z") },
      { status: VisitStatus.COMPLETED, scheduledAt: new Date("2026-04-20T10:00:00.000Z") },
    ];
    expect(countUpcomingVisits(visits)).toBe(4);
  });

  it("excludes completed cancelled missed rejected rescheduled", () => {
    const visits = [
      { status: VisitStatus.COMPLETED, scheduledAt: new Date("2026-04-20T10:00:00.000Z") },
      { status: VisitStatus.CANCELLED, scheduledAt: new Date("2026-04-20T10:00:00.000Z") },
      { status: VisitStatus.CONFIRMED, scheduledAt: new Date("2026-04-22T10:00:00.000Z") },
    ];
    expect(countUpcomingVisits(visits)).toBe(1);
  });

  it("counts completed in window by completedAt", () => {
    const visits = [
      {
        status: VisitStatus.COMPLETED,
        scheduledAt: new Date("2026-02-01T10:00:00.000Z"),
        completedAt: new Date("2026-04-10T15:00:00.000Z"),
      },
      {
        status: VisitStatus.COMPLETED,
        scheduledAt: new Date("2026-04-12T10:00:00.000Z"),
        completedAt: new Date("2026-03-01T15:00:00.000Z"),
      },
    ];
    expect(countCompletedVisitsInRollingWindow(visits, 30, now)).toBe(1);
  });

  it("counts missed in window by scheduledAt", () => {
    const visits = [
      {
        status: VisitStatus.MISSED,
        scheduledAt: new Date("2026-04-10T10:00:00.000Z"),
      },
    ];
    expect(countMissedVisitsInRollingWindow(visits, 30, now)).toBe(1);
  });
});
