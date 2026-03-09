import { useState, useEffect } from 'react';

export interface DashboardVisibilitySettings {
  revenue: boolean;
  activeUsers: boolean;
  activePackages: boolean;
  mikrotiks: boolean;
  systemHealth: boolean;
  graphs: boolean;
  equipmentTracker: boolean;
  realTimeMonitor: boolean;
  paymentHistory: boolean;
  revenueGraph: boolean;
  clientsGraph: boolean;
  packageStatsGraph: boolean;
  mikrotikStatusGraph: boolean;
  subscriptionGraph: boolean;
  adminActivityGraph: boolean;
}

const defaultSettings: DashboardVisibilitySettings = {
  revenue: true,
  activeUsers: true,
  activePackages: true,
  mikrotiks: true,
  systemHealth: true,
  graphs: true,
  equipmentTracker: true,
  realTimeMonitor: true,
  paymentHistory: true,
  revenueGraph: true,
  clientsGraph: true,
  packageStatsGraph: true,
  mikrotikStatusGraph: true,
  subscriptionGraph: true,
  adminActivityGraph: true,
};

export const useDashboardVisibility = (userId: string = 'guest') => {
  const storageKey = `dashboard-visibility-${userId}`;
  
  const [settings, setSettings] = useState<DashboardVisibilitySettings>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save dashboard visibility settings:', error);
    }
  }, [settings, storageKey]);

  const toggleVisibility = (key: keyof DashboardVisibilitySettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const hideAll = () => {
    setSettings(Object.keys(defaultSettings).reduce((acc, key) => ({
      ...acc,
      [key]: false
    }), {} as DashboardVisibilitySettings));
  };

  const showAll = () => {
    setSettings(defaultSettings);
  };

  return {
    settings,
    toggleVisibility,
    resetToDefaults,
    hideAll,
    showAll,
  };
};