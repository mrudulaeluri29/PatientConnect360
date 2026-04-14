"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_AGENCY_SETTINGS = void 0;
exports.getAgencySettings = getAgencySettings;
const db_1 = require("../db");
exports.DEFAULT_AGENCY_SETTINGS = {
    id: "default",
    portalName: "MediHealth",
    logoUrl: null,
    primaryColor: "#6E5B9A",
    supportEmail: null,
    supportPhone: null,
    supportName: "Support Team",
    supportHours: "Mon-Fri, 8am-5pm",
    notificationDefaults: "Send appointment reminders 24 hours before scheduled visits and route urgent issues to the support contact.",
    pilotLaunchNotes: "Pilot focus: verify onboarding, scheduling, messaging, records access, and family feedback workflows during the first two weeks.",
    messagingEnabled: true,
    notificationsEnabled: true,
    recordsEnabled: true,
    feedbackEnabled: true,
};
async function getAgencySettings() {
    return db_1.prisma.agencySettings.upsert({
        where: { id: exports.DEFAULT_AGENCY_SETTINGS.id },
        update: {},
        create: exports.DEFAULT_AGENCY_SETTINGS,
    });
}
