import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function AlertDrawer() {
  const { isAlertDrawerOpen, setIsAlertDrawerOpen, alerts } = useApp();
  const navigate = useNavigate();

  if (!isAlertDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsAlertDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface-container-lowest border-l border-outline-variant shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-space-lg border-b border-outline-variant/50 bg-primary-container text-on-primary flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-error text-2xl animate-pulse">
                warning
              </span>
              <div>
                <h3 className="font-headline-sm text-sm font-semibold tracking-wide">
                  ACTIVE SIF PRECURSOR ALERTS
                </h3>
                <p className="font-body-sm text-xs text-primary-fixed-dim">
                  Immediate HSE barrier triage required
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAlertDrawerOpen(false)}
              className="text-primary-fixed-dim hover:text-on-primary p-1 rounded hover:bg-surface-container-highest/20"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* List of alerts */}
          <div className="flex-1 overflow-y-auto p-space-lg space-y-space-md">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-space-md bg-surface-container-low border border-outline-variant/80 rounded-lg hover:border-secondary transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-code-sm text-xs font-semibold text-secondary">
                    {alert.id}
                  </span>
                  <span
                    className={`font-label-sm text-[11px] font-semibold px-2 py-0.5 rounded border ${alert.severityColor}`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <h4 className="font-headline-sm text-sm text-on-surface mb-2 font-semibold group-hover:text-secondary transition-colors">
                  {alert.title}
                </h4>
                <div className="space-y-1 font-body-sm text-xs text-on-surface-variant mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-outline">location_on</span>
                    <span>{alert.facility}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-outline">shield</span>
                    <span>Compromised Barrier: <strong>{alert.barrier}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-error">analytics</span>
                    <span>SIF Risk Score: <strong className="font-mono text-error">{alert.precursorScore}</strong></span>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between">
                  <span className="text-[11px] font-code-sm text-outline">{alert.time}</span>
                  <button
                    onClick={() => {
                      setIsAlertDrawerOpen(false);
                      navigate(`/reports/${alert.id}`);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-on-secondary hover:bg-secondary px-2.5 py-1 rounded transition-colors"
                  >
                    <span>Investigate</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="p-space-md border-t border-outline-variant/40 bg-surface-container-low flex items-center justify-between">
            <span className="font-body-sm text-xs text-on-surface-variant">
              3 unacknowledged precursors
            </span>
            <button
              onClick={() => {
                setIsAlertDrawerOpen(false);
                navigate('/reports');
              }}
              className="font-label-sm text-xs text-secondary hover:underline font-semibold"
            >
              View Incident Registry (Prototype)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
