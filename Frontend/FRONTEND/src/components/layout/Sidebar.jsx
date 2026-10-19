import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Sidebar() {
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useApp();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups = [
    {
      title: 'Compliance Operations',
      items: [
        { path: '/', label: 'Executive Dashboard', icon: 'dashboard' },
        { path: '/investigation', label: 'Safety Investigation', icon: 'troubleshoot', badge: 'AI' },
        { path: '/regulatory', label: 'Regulatory Intelligence', icon: 'policy', badge: 'TinyFish' },
      ]
    },
    {
      title: 'Auditing & Governance',
      items: [
        { path: '/certificates', label: 'Certificate Monitoring', icon: 'verified', alertBadge: '2' },
        { path: '/findings', label: 'Findings & Review', icon: 'fact_check', badge: 'Queue' },
        { path: '/audit', label: 'Immutable Audit Trail', icon: 'history_edu' },
      ]
    },
    {
      title: 'Incident Telemetry & RAG',
      items: [
        { path: '/reports', label: 'Incident Registry', icon: 'assignment_late' },
        { path: '/analytics', label: 'Site Risk Analytics', icon: 'monitoring' },
        { path: '/patterns', label: 'Pattern Intelligence', icon: 'hub' },
      ]
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B1528] text-slate-200 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-[#091122]">
        <NavLink to="/" className="flex items-center gap-3 min-w-0 group" onClick={() => setMobileOpen(false)}>
          <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 text-blue-400 group-hover:bg-blue-600/30 transition-all">
            <span className="material-symbols-outlined text-xl">shield_locked</span>
          </div>
          {(!isSidebarCollapsed || mobileOpen) && (
            <div className="flex flex-col min-w-0">
              <span className="font-['Public_Sans'] font-bold text-sm tracking-wide text-white truncate leading-tight">
                COMPLIANCE AUDITOR
              </span>
              <span className="font-mono text-[9px] tracking-wider text-blue-400 font-semibold uppercase truncate">
                Autonomous Safety Intelligence
              </span>
            </div>
          )}
        </NavLink>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden md:flex text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800/80 transition-colors"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">
            {isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            {(!isSidebarCollapsed || mobileOpen) && (
              <div className="px-3 text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-400 mb-2">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    title={isSidebarCollapsed && !mobileOpen ? item.label : undefined}
                    className={`flex items-center ${
                      isSidebarCollapsed && !mobileOpen ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/30 ring-1 ring-blue-400/50'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`material-symbols-outlined text-xl leading-none flex-shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300'
                        }`}
                      >
                        {item.icon}
                      </span>
                      {(!isSidebarCollapsed || mobileOpen) && (
                        <span className="truncate font-medium">{item.label}</span>
                      )}
                    </div>

                    {(!isSidebarCollapsed || mobileOpen) && item.alertBadge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                        {item.alertBadge}
                      </span>
                    )}

                    {(!isSidebarCollapsed || mobileOpen) && item.badge && !item.alertBadge && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-md ${
                        item.badge === 'TinyFish'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* TinyFish Status Badge Footer */}
      {(!isSidebarCollapsed || mobileOpen) ? (
        <div className="p-3 border-t border-slate-800/80 bg-[#070e1c] text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              TinyFish API
            </span>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/60">
              Active
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Search + Fetch Live Grounding
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-800 text-center flex justify-center py-3" title="TinyFish Grounding Active">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-3 left-4 z-30">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-[#0F1E36] text-white shadow-lg border border-slate-700 active:scale-95 transition-transform"
          type="button"
          aria-label="Toggle Navigation Menu"
        >
          <span className="material-symbols-outlined text-xl">
            {mobileOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-in Drawer */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 z-40 w-72 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
