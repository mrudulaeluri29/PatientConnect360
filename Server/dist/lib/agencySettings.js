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
};
async function getAgencySettings() {
    return db_1.prisma.agencySettings.upsert({
        where: { id: exports.DEFAULT_AGENCY_SETTINGS.id },
        update: {},
        create: exports.DEFAULT_AGENCY_SETTINGS,
    });
}
