import { prisma } from "../db";

export const DEFAULT_AGENCY_SETTINGS = {
  id: "default",
  portalName: "MediHealth",
  logoUrl: null,
  primaryColor: "#6E5B9A",
  supportEmail: null,
  supportPhone: null,
  supportName: "Support Team",
  supportHours: "Mon-Fri, 8am-5pm",
};

export async function getAgencySettings() {
  return prisma.agencySettings.upsert({
    where: { id: DEFAULT_AGENCY_SETTINGS.id },
    update: {},
    create: DEFAULT_AGENCY_SETTINGS,
  });
}
