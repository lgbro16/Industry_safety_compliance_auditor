import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const initialAlerts = [
  {
    id: 'PROTO-10231',
    title: 'Energy Isolation Bypass During High-Pressure Pump Overhaul',
    facility: 'Duliajan Drilling Complex (Rig #4)',
    time: '24 mins ago',
    severity: 'SIF CRITICAL',
    severityColor: 'text-error bg-error-container/30 border-error',
    barrier: 'Energy Isolation / LOTO',
    precursorScore: '0.94',
    status: 'ACTIVE INVESTIGATION'
  },
  {
    id: 'PROTO-10228',
    title: 'Atmospheric H2S Sensor Calibration Drift (>15 ppm)',
    facility: 'Moran Central Tank Farm',
    time: '2 hrs ago',
    severity: 'HIGH PRECURSOR',
    severityColor: 'text-amber-700 bg-amber-50 border-amber-400',
    barrier: 'Gas Detection / Ventilation',
    precursorScore: '0.88',
    status: 'HSE REVIEW PENDING'
  },
  {
    id: 'PROTO-10219',
    title: 'Crane Hoist Wire-Rope Strand Breakage in SIMOPS Zone',
    facility: 'Digboi Feeder Line 9',
    time: '5 hrs ago',
    severity: 'HIGH PRECURSOR',
    severityColor: 'text-amber-700 bg-amber-50 border-amber-400',
    barrier: 'Mechanical Integrity',
    precursorScore: '0.81',
    status: 'ACTION REQUIRED'
  }
];

export function AppProvider({ children }) {
  const [currentFacility, setCurrentFacility] = useState('All Facilities (Site A, Site B, Duliajan Assets)');
  const [currentPeriod, setCurrentPeriod] = useState('Last 90 Days (Q3 2026)');
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <AppContext.Provider
      value={{
        currentFacility,
        setCurrentFacility,
        currentPeriod,
        setCurrentPeriod,
        isAlertDrawerOpen,
        setIsAlertDrawerOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        alerts,
        setAlerts,
        toastMessage,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
