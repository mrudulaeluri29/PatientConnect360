"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPilotReadiness = buildPilotReadiness;
const db_1 = require("../db");
const agencySettings_1 = require("./agencySettings");
const adminKpis_1 = require("./adminKpis");
function makeItem(id, category, label, status, detail, blocking = false) {
    return { id, category, label, status, detail, blocking };
}
async function buildPilotReadiness() {
    const [settings, analytics, adminCount, patientCount, clinicianCount, loginAuditCount] = await Promise.all([
        (0, agencySettings_1.getAgencySettings)(),
        (0, adminKpis_1.buildAdminAnalytics)(),
        db_1.prisma.user.count({ where: { role: "ADMIN" } }),
        db_1.prisma.user.count({ where: { role: "PATIENT" } }),
        db_1.prisma.user.count({ where: { role: "CLINICIAN" } }),
        db_1.prisma.auditLog.count({ where: { actionType: "LOGIN" } }),
    ]);
    const supportConfigured = Boolean(settings.supportName && (settings.supportEmail || settings.supportPhone));
    const brandingConfigured = settings.portalName.trim().length > 0 && settings.primaryColor.trim().length > 0;
    const activeAssignmentsReady = analytics.operationalQueues.activeAssignments > 0;
    const visitWorkflowReady = analytics.summary.visitsPerWeek > 0 ||
        analytics.operationalQueues.pendingVisitRequests > 0 ||
        analytics.operationalQueues.pendingRescheduleRequests > 0;
    const feedbackObservabilityReady = settings.feedbackEnabled;
    const auditReady = loginAuditCount > 0;
    const userBaseReady = patientCount > 0 && clinicianCount > 0;
    const adminCoverageReady = adminCount > 0;
    const checklist = [
        makeItem("admin-coverage", "Access", "Admin access is provisioned", adminCoverageReady ? "complete" : "attention", adminCoverageReady ? `${adminCount} admin account(s) can access the operational console.` : "Create at least one admin user for pilot oversight.", true),
        makeItem("user-base", "Onboarding", "Pilot users are present", userBaseReady ? "complete" : "attention", userBaseReady
            ? `${patientCount} patient(s) and ${clinicianCount} clinician(s) are available for pilot workflows.`
            : "Add at least one patient and one clinician before pilot validation.", true),
        makeItem("assignments", "Operations", "Patient-clinician assignments exist", activeAssignmentsReady ? "complete" : "attention", activeAssignmentsReady
            ? `${analytics.operationalQueues.activeAssignments} active assignment(s) are in place.`
            : "Create at least one patient-clinician assignment.", true),
        makeItem("branding", "Configuration", "Branding and support contact are configured", brandingConfigured && supportConfigured ? "complete" : "attention", brandingConfigured && supportConfigured
            ? "Portal branding and support contact details are set for pilot users."
            : "Finish branding/support details so agency users know who to contact during the pilot.", true),
        makeItem("messaging", "Features", "Messaging is enabled for the pilot", settings.messagingEnabled ? "complete" : "attention", settings.messagingEnabled
            ? `${analytics.summary.messagesLast90Days} message(s) were observed in the current reporting window.`
            : "Enable messaging or communicate that messaging is out of scope for this pilot."),
        makeItem("records", "Features", "Records and documentation access is enabled", settings.recordsEnabled ? "complete" : "attention", settings.recordsEnabled
            ? "Patient records workflows are available from the admin console."
            : "Enable records visibility before pilot launch if documentation review is in scope."),
        makeItem("feedback", "Quality", "Family feedback capture is ready", feedbackObservabilityReady ? "complete" : "monitor", feedbackObservabilityReady
            ? analytics.familyFeedbackSummary.total > 0
                ? `${analytics.familyFeedbackSummary.total} feedback response(s) recorded so far.`
                : "Feedback collection is enabled and ready once caregivers begin submitting responses."
            : "Feedback collection is disabled for this pilot window."),
        makeItem("visit-workflow", "Operations", "Visit workflow is active", visitWorkflowReady ? "complete" : "monitor", visitWorkflowReady
            ? `Visits/week ${analytics.summary.visitsPerWeek}, pending review items ${analytics.summary.pendingVisitRequests}.`
            : "No recent visit activity detected yet. Validate appointment requests during pilot kickoff."),
        makeItem("audit", "Governance", "Audit logging is recording activity", auditReady ? "complete" : "attention", auditReady ? `${loginAuditCount} login audit event(s) detected.` : "No login audit events found yet; verify authentication and audit capture.", true),
    ];
    const missingItems = checklist.filter((item) => item.status !== "complete").map((item) => item.label);
    const blockingItems = checklist.filter((item) => item.blocking && item.status !== "complete").map((item) => item.label);
    const readinessScore = Math.round((checklist.filter((item) => item.status === "complete").length / checklist.length) * 100);
    const status = blockingItems.length === 0 ? "ready" : "attention";
    return {
        generatedAt: new Date().toISOString(),
        status,
        readinessScore,
        checklist,
        missingItems,
        blockingItems,
        recommendedNextActions: missingItems.slice(0, 4),
        environment: {
            databaseConnected: true,
            telemetry: "Infrastructure uptime/latency telemetry is not instrumented in this MVP; operational readiness is based on live workflow signals.",
            supportConfigured,
            brandingConfigured,
            messagingEnabled: settings.messagingEnabled,
            notificationsEnabled: settings.notificationsEnabled,
            recordsEnabled: settings.recordsEnabled,
            feedbackEnabled: settings.feedbackEnabled,
        },
        highlights: {
            summary: analytics.summary,
            operationalQueues: analytics.operationalQueues,
            engagement: analytics.engagement,
            familyFeedbackSummary: analytics.familyFeedbackSummary,
        },
        featureFlags: {
            messagingEnabled: settings.messagingEnabled,
            notificationsEnabled: settings.notificationsEnabled,
            recordsEnabled: settings.recordsEnabled,
            feedbackEnabled: settings.feedbackEnabled,
        },
        pilotGuide: {
            notificationDefaults: settings.notificationDefaults,
            launchNotes: settings.pilotLaunchNotes,
            supportContact: {
                name: settings.supportName,
                email: settings.supportEmail,
                phone: settings.supportPhone,
                hours: settings.supportHours,
            },
        },
    };
}
