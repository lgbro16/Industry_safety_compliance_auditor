import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Header() {
  const {
    currentFacility,
    setCurrentFacility,
    currentPeriod,
    setCurrentPeriod,
    setIsAlertDrawerOpen,
    isSidebarCollapsed,
    showToast
  } = useApp();

  const [searchVal, setSearchVal] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    showToast(`Filtering safety intelligence for: "${searchVal}"`);
    navigate(`/reports?q=${encodeURIComponent(searchVal)}`);
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-20 px-6 flex items-center justify-between gap-4 transition-all duration-300 ${
        isSidebarCollapsed ? 'md:left-20' : 'md:left-64'
      } left-0`}
    >
      {/* Search Input with generous comfortable width */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:block">
        <div className="relative flex items-center w-full">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-xl pointer-events-none">
            smart_toy
          </span>
          <input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-slate-100/80 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 transition-all"
            placeholder="Ask Safety AI (e.g. show high-risk pump isolations)..."
            type="search"
          />
        </div>
      </form>

      {/* Action Controls & Filters */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Facility Selector */}
        <div className="hidden xl:flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-lg px-3 h-10">
          <span className="material-symbols-outlined text-slate-500 text-lg">
            location_on
          </span>
          <select
            value={currentFacility}
            onChange={(e) => {
              setCurrentFacility(e.target.value);
              showToast(`Active Asset Facility: ${e.target.value}`);
            }}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer pr-1"
          >
            <option>All Facilities (Site A, Site B, Duliajan Assets)</option>
            <option>Duliajan Drilling Complex</option>
            <option>Moran Exploration Hub</option>
            <option>Digboi Refinery Feeder</option>
            <option>Nahorkatiya Compressor Station</option>
          </select>
        </div>

        {/* Period Selector */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-lg px-3 h-10">
          <span className="material-symbols-outlined text-slate-500 text-lg">
            calendar_today
          </span>
          <select
            value={currentPeriod}
            onChange={(e) => {
              setCurrentPeriod(e.target.value);
              showToast(`Active Telemetry Window: ${e.target.value}`);
            }}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer pr-1"
          >
            <option>Last 90 Days (Q3 2026)</option>
            <option>Last 30 Days</option>
            <option>Year-to-Date 2026</option>
            <option>Previous Fiscal Year</option>
          </select>
        </div>

        {/* SIF Alert Pill Button with pulsing beacon */}
        <button
          onClick={() => setIsAlertDrawerOpen(true)}
          className="relative flex items-center gap-2 h-10 px-3.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition-all duration-150 cursor-pointer shadow-sm group active:scale-95"
          title="3 Critical SIF Precursors Active"
          type="button"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
          <span className="font-mono text-xs font-bold tracking-wide">
            3 SIF ALERTS
          </span>
        </button>

        {/* Profile Avatar & Dropdown */}
        <div className="relative pl-2 border-l border-slate-200">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 text-left focus:outline-none group p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
            type="button"
          >
            <div className="relative">
              <img
                alt="HSE Reviewer"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300 group-hover:ring-blue-600 transition-all"
                src="/avatar.png"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
            <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-700 text-sm">
              expand_more
            </span>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <img
                  alt="HSE Reviewer"
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                  src="/avatar.png"
                />
                <div className="min-w-0">
                  <div className="font-['Public_Sans'] text-sm font-bold text-slate-900 truncate">
                    Lead HSE Reviewer
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    Asset Safety Operations
                  </div>
                  <div className="font-mono text-[10px] text-blue-700 font-semibold mt-0.5">
                    HSE PROTOCOL REVIEWER (PROTOTYPE)
                  </div>
                </div>
              </div>
              <div className="py-2 text-xs text-slate-600 space-y-1">
                <div
                  onClick={() => {
                    navigate('/export');
                    setShowProfileMenu(false);
                  }}
                  className="px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base text-slate-500">verified_user</span>
                  <span>Accreditation Dossiers</span>
                </div>
                <div
                  onClick={() => {
                    navigate('/review');
                    setShowProfileMenu(false);
                  }}
                  className="px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base text-slate-500">rate_review</span>
                  <span>Review Queue (4 items)</span>
                </div>
                <div
                  onClick={() => {
                    showToast('Signed out of session');
                    setShowProfileMenu(false);
                  }}
                  className="px-2 py-1.5 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span>Log Out</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
