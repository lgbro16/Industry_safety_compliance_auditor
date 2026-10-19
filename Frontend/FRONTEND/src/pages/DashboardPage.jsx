import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getApiUrl } from '../config/api';
import { useApp } from '../context/AppContext';

export default function DashboardPage() {
  const { showToast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/audit/dashboard'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError('Unable to connect to Compliance Auditor Backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <span className="text-sm font-mono tracking-wide">Synthesizing Safety & Regulatory Telemetry...</span>
        </div>
      </div>
    );
  }

  const facility = data?.facility_overview || {};
  const findings = data?.findings_by_severity || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const certs = data?.certificates_summary || { VALID: 0, EXPIRING_SOON: 0, EXPIRED: 0, MISSING_REQUIRED: 0 };
  const research = data?.external_research_activity || {};
  const regUpdates = data?.recent_regulatory_updates || [];

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Header & Facility Overview Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">
              FACILITY ASSET COMPLIANCE
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-mono">Real-Time Autonomous Assurance</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-['Public_Sans'] text-slate-900 tracking-tight">
            {facility.name || 'Digboi Central Operations & Field Installations'}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Autonomous industrial safety compliance engine grounded by TinyFish Search & Fetch APIs. Cross-references internal incident observations against OSHA, DGMS, and HSE statutory standards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/investigation"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm transition-all shadow-blue-500/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">troubleshoot</span>
            New Safety Investigation
          </NavLink>
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Refresh Telemetry"
            type="button"
          >
            <span className="material-symbols-outlined text-lg leading-none">refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Severity & Compliance Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Findings */}
        <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider text-red-700 uppercase">Critical Findings</span>
            <span className="p-1.5 rounded-md bg-red-50 text-red-600 material-symbols-outlined text-lg">dangerous</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-['Public_Sans']">{findings.CRITICAL}</span>
            <span className="text-xs text-red-600 font-medium">Immediate Halt</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Unverified confined space or pressure boundary breach.</p>
        </div>

        {/* High Severity Findings */}
        <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider text-amber-700 uppercase">High Compliance Gaps</span>
            <span className="p-1.5 rounded-md bg-amber-50 text-amber-600 material-symbols-outlined text-lg">warning</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-['Public_Sans']">{findings.HIGH}</span>
            <span className="text-xs text-amber-600 font-medium">Corrective Action</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">LOTO isolation deficiency or work-at-height tag missing.</p>
        </div>

        {/* Certificates Requiring Attention */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider text-slate-700 uppercase">Certificates Alert</span>
            <span className="p-1.5 rounded-md bg-purple-50 text-purple-600 material-symbols-outlined text-lg">verified</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-['Public_Sans']">
              {certs.EXPIRED + certs.EXPIRING_SOON + certs.MISSING_REQUIRED}
            </span>
            <span className="text-xs text-purple-700 font-medium">
              {certs.EXPIRED} Expired / {certs.EXPIRING_SOON} Soon
            </span>
          </div>
          <NavLink to="/certificates" className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
            View Certificate Register →
          </NavLink>
        </div>

        {/* TinyFish Research Engine Status */}
        <div className="bg-[#0B1528] text-white rounded-xl border border-slate-800 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider text-blue-400 uppercase">TinyFish Grounding</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {research.mode === 'LIVE_TINYFISH_API' ? 'LIVE API' : 'SIMULATION'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>{research.approved_domains_count || 13} Approved Domains</span>
            <NavLink to="/regulatory" className="text-blue-400 hover:text-blue-300 font-mono">
              Explore →
            </NavLink>
          </div>
        </div>
      </div>

      {/* Main Two-Column Operational Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Candidate Findings Awaiting Review */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-xl">fact_check</span>
                <h2 className="font-['Public_Sans'] font-bold text-base text-slate-900">
                  Candidate Findings Awaiting Qualified Review
                </h2>
              </div>
              <NavLink to="/findings" className="text-xs font-semibold text-blue-600 hover:text-blue-800 font-mono">
                Full Review Queue ({data?.total_candidate_findings || 0}) →
              </NavLink>
            </div>

            <div className="divide-y divide-slate-100">
              {data?.recent_audit_trail?.length > 0 ? (
                <div className="p-4 space-y-3">
                  <div className="p-4 rounded-lg bg-red-50/60 border border-red-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-600 text-white rounded">
                            CRITICAL
                          </span>
                          <span className="text-xs font-mono text-slate-500">OSHA 29 CFR 1910.146(d)(5)</span>
                        </div>
                        <h3 className="font-semibold text-slate-900 text-sm mt-1.5">
                          Omission of Pre-entry Multi-gas Testing in Crude Separator V-102
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Vessel entered without documented 4-gas atmospheric logs. Calibrated instrument GD-PORT-09 calibration has lapsed.
                        </p>
                      </div>
                      <NavLink
                        to="/findings"
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-medium rounded-md shadow-sm flex-shrink-0"
                      >
                        Adjudicate
                      </NavLink>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-600 text-white rounded">
                            HIGH
                          </span>
                          <span className="text-xs font-mono text-slate-500">DGMS Oil Mines Regs / ASME Sec VIII</span>
                        </div>
                        <h3 className="font-semibold text-slate-900 text-sm mt-1.5">
                          Pressure Vessel Hydrostatic Retest Lapsed on High-Pressure Gas Separator
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Certificate CERT-2026-001 expired 20 days ago while vessel remains energized at 45 bar.
                        </p>
                      </div>
                      <NavLink
                        to="/findings"
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-medium rounded-md shadow-sm flex-shrink-0"
                      >
                        Adjudicate
                      </NavLink>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No candidate findings currently awaiting review.
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-mono">
                Unreviewed candidate findings are NOT represented as confirmed statutory violations.
              </span>
            </div>
          </div>

          {/* Quick Scenario Launchpad */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900 mb-2">
              Launch High-Risk Scenario Audit
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Select an authentic industrial safety observation to evaluate TinyFish autonomous search, fetch, and evidence correlation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <NavLink
                to="/investigation?preset=confined_space"
                className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all text-left group"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                  <span className="material-symbols-outlined text-red-500 text-base">air</span>
                  Confined Space Gas Isolation
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  Separator V-102 entered without calibrated gas testing or attendant.
                </div>
              </NavLink>

              <NavLink
                to="/investigation?preset=crane_lift"
                className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all text-left group"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                  <span className="material-symbols-outlined text-amber-500 text-base">precision_manufacturing</span>
                  Crane Proof Load & Wire Rope
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  Mobile crane CR-04 lifting drill collars with damaged wire rope strands.
                </div>
              </NavLink>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Recently Fetched Regulations & Asset Integrity */}
        <div className="space-y-6">
          {/* Recently Retrieved Regulatory Documents */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-700 text-lg">policy</span>
                <h3 className="font-['Public_Sans'] font-bold text-sm text-slate-900">
                  Regulatory Intelligence Feed
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-100 text-blue-800 rounded font-semibold">
                SHA-256 Verified
              </span>
            </div>

            <div className="p-4 space-y-3">
              {regUpdates.map((doc, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono font-bold text-blue-700 uppercase">{doc.domain}</span>
                    <span className="font-mono text-slate-400 text-[10px]">v{doc.version || 1}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 leading-snug">{doc.title}</h4>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate max-w-[140px]">Hash: {doc.content_hash?.substring(0, 10)}...</span>
                    <span className="text-emerald-700 font-semibold">
                      {doc.change_detected ? 'Updated' : 'Verified Current'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 text-center">
              <NavLink to="/regulatory" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                Search Official Regulations with TinyFish →
              </NavLink>
            </div>
          </div>

          {/* Monitored Installations Overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-['Public_Sans'] font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-500 text-lg">domain</span>
              Active Installation Integrity
            </h3>
            <div className="space-y-2.5">
              {[
                { name: 'Digboi Tank Farm', status: 'AUDIT ACTION', color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { name: 'Drilling Rig #04 (Moran)', status: 'EXPIRING SOON', color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { name: 'Wellhead Platform 12', status: 'VERIFIED COMPLIANT', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                { name: 'Compressor Station Alpha', status: 'GAS CALIBRATION OVERDUE', color: 'text-red-700 bg-red-50 border-red-200' },
              ].map((inst, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs">
                  <span className="font-medium text-slate-800">{inst.name}</span>
                  <span className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded border ${inst.color}`}>
                    {inst.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
