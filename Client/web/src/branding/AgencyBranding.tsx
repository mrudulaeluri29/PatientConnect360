import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getAgencySettings, type AgencySettings } from "../api/admin";

type AgencyBrandingContextValue = {
  settings: AgencySettings;
  loading: boolean;
  refresh: () => Promise<void>;
};

const DEFAULT_SETTINGS: AgencySettings = {
  id: "default",
  portalName: "MediHealth",
  logoUrl: null,
  primaryColor: "#6E5B9A",
  supportEmail: null,
  supportPhone: null,
  supportName: "Support Team",
  supportHours: "Mon-Fri, 8am-5pm",
};

const AgencyBrandingContext = createContext<AgencyBrandingContextValue | undefined>(undefined);

function applyBranding(settings: AgencySettings) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", settings.primaryColor || DEFAULT_SETTINGS.primaryColor);
}

export function AgencyBrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const next = await getAgencySettings(false);
      setSettings(next);
      applyBranding(next);
    } catch (error) {
      console.error("Failed to load agency branding:", error);
      applyBranding(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AgencyBrandingContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </AgencyBrandingContext.Provider>
  );
}

export function useAgencyBranding() {
  const context = useContext(AgencyBrandingContext);
  if (!context) {
    throw new Error("useAgencyBranding must be used within AgencyBrandingProvider");
  }
  return context;
}
