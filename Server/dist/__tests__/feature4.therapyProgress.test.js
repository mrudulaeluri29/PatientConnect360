"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const therapyProgress_1 = require("../lib/therapyProgress");
describe("Feature 4 therapy progress (pure helpers)", () => {
    it("maps progress status to 0/50/100 points", () => {
        expect((0, therapyProgress_1.progressStatusToPoints)("NOT_STARTED")).toBe(0);
        expect((0, therapyProgress_1.progressStatusToPoints)("IN_PROGRESS")).toBe(50);
        expect((0, therapyProgress_1.progressStatusToPoints)("COMPLETED")).toBe(100);
    });
    it("computeCarePlanItemMetrics averages item scores", () => {
        const plan = {
            items: [
                {
                    progress: [{ patientId: "p1", status: "COMPLETED" }],
                },
                {
                    progress: [{ patientId: "p1", status: "NOT_STARTED" }],
                },
            ],
            checkIns: [],
        };
        const m = (0, therapyProgress_1.computeCarePlanItemMetrics)(plan, "p1");
        expect(m.carePlanItemProgressPercent).toBe(50);
        expect(m.carePlanItemCounts).toEqual({
            total: 2,
            notStarted: 1,
            inProgress: 0,
            completed: 1,
        });
    });
    it("computeCarePlanItemMetrics handles null plan", () => {
        const m = (0, therapyProgress_1.computeCarePlanItemMetrics)(null, "p1");
        expect(m.carePlanItemProgressPercent).toBeNull();
        expect(m.carePlanItemCounts.total).toBe(0);
    });
    it("mergeTherapySupportingNotes when caregiver care plan blocked still mentions HEP", () => {
        const hep = {
            activeAssignmentCount: 1,
            expectedCompletionsThisWeek: 3,
            actualCompletionsLast7Days: 1,
            adherencePercent: 33,
        };
        const s = (0, therapyProgress_1.mergeTherapySupportingNotes)("", hep, false);
        expect(s).toContain("Care plan details are not shared");
        expect(s).toContain("Therapy exercises");
    });
    it("mergeTherapySupportingNotes when allowed combines care plan base and HEP", () => {
        const hep = {
            activeAssignmentCount: 1,
            expectedCompletionsThisWeek: 2,
            actualCompletionsLast7Days: 2,
            adherencePercent: 100,
        };
        const s = (0, therapyProgress_1.mergeTherapySupportingNotes)("Care plan line.", hep, true);
        expect(s).toContain("Care plan line");
        expect(s).toContain("Therapy exercises");
    });
});
describe("Feature 4 HEP adherence (DB)", () => {
    it("returns zeros when no assignments", async () => {
        const h = await (0, therapyProgress_1.computeHepAdherenceForPatient)("definitely-nonexistent-patient-id-00000");
        expect(h.activeAssignmentCount).toBe(0);
        expect(h.expectedCompletionsThisWeek).toBe(0);
        expect(h.actualCompletionsLast7Days).toBe(0);
        expect(h.adherencePercent).toBeNull();
    });
});
