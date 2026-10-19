import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function SiteAnalyticsPage() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [searchPrompt, setSearchPrompt] = useState('');
  const [activeSite, setActiveSite] = useState('ALL');

  const suggestionPrompts = [
    'Show all barrier failures during hot work at Moran Hub in last 60 days',
    'Which contractor had the highest SIF precursor rate at Duliajan Rig #4?',
    'Show LOTO bypass frequency correlation with night shift handovers',
    'Compare barrier health: Duliajan Rig #4 vs Digboi Feeder Line 9'
  ];

  const handlePromptClick = (p) => {
    setSearchPrompt(p);
    showToast(`Synthesizing intelligence for: "${p}"`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchPrompt.trim()) return;
    showToast(`Executing semantic cross-site synthesis for: "${searchPrompt}"`);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded tracking-wide">
              FIELD-ANALYTICS
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">monitoring</span>
              Cross-Asset Risk Profiling & Activity Vulnerability
            </span>
          </div>
          <h1 className="font-['Public_Sans'] font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Cross-Asset Risk Profiling & Activity Analytics
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Correlate high-consequence operational hazards across facilities, contractor work forces, and operational activities to pinpoint vulnerable barriers before SIF events occur.
          </p>
        </div>

        <button
          onClick={() => navigate('/patterns')}
          className="h-10 px-4 bg-[#0F1E36] hover:bg-[#162B4D] text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start lg:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base text-blue-300">science</span>
          <span>Scenario Safety Assessment</span>
        </button>
      </div>

      {/* NATURAL LANGUAGE QUERY ENGINE CARD */}
      <div className="cad-card p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-700 text-xl">smart_toy</span>
            <h2 className="font-['Public_Sans'] font-bold text-base text-slate-900">
              Safety Intelligence Natural Language Search
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-400">SEMANTIC NLP VECTOR</span>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-xl pointer-events-none">
              search
            </span>
            <input
              value={searchPrompt}
              onChange={(e) => setSearchPrompt(e.target.value)}
              placeholder="Ask questions across all incident reports... (e.g. Show all barrier failures during hot work at Moran Hub)"
              className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 transition-all"
            />
          </div>
          <button
            type="submit"
            className="h-12 px-6 bg-[#0F1E36] hover:bg-[#162B4D] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <span>Query Engine</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </form>

        {/* Suggestion prompt chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs font-semibold text-slate-500">Quick queries:</span>
          {suggestionPrompts.map((p) => (
            <button
              key={p}
              onClick={() => handlePromptClick(p)}
              type="button"
              className="px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-full text-xs font-medium border border-slate-200 transition-colors cursor-pointer text-left truncate max-w-xs"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ASSET RISK BENCHMARK GRID */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-['Public_Sans'] font-bold text-lg text-slate-900">
              Asset Site Risk Profiling & Benchmark Grid
            </h2>
            <p className="text-xs text-slate-500">Comparing regional drilling complexes and processing terminals</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {['ALL', 'DRILLING', 'PROCESSING', 'PIPELINE'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSite(tab)}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                  activeSite === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              name: 'Duliajan Drilling Rig #4',
              type: 'Exploration Drilling',
              riskScore: 88,
              level: 'HIGH SIF RISK',
              levelColor: 'bg-red-100 text-red-700 border-red-200',
              precursors: 58,
              topBarrier: 'Energy Isolation (38%)',
              inspections: 412,
              contractorShare: '72%'
            },
            {
              name: 'Moran Central Tank Farm',
              type: 'Crude Storage Terminal',
              riskScore: 74,
              level: 'ELEVATED RISK',
              levelColor: 'bg-orange-100 text-orange-700 border-orange-200',
              precursors: 42,
              topBarrier: 'H2S Gas Detection (29%)',
              inspections: 380,
              contractorShare: '55%'
            },
            {
              name: 'Digboi Feeder Line 9',
              type: 'Hydrocarbon Pipeline',
              riskScore: 59,
              level: 'MODERATE RISK',
              levelColor: 'bg-amber-100 text-amber-700 border-amber-200',
              precursors: 26,
              topBarrier: 'Crane Rigging / Drop (24%)',
              inspections: 290,
              contractorShare: '64%'
            },
            {
              name: 'Nahorkatiya Compressor',
              type: 'Gas Booster Station',
              riskScore: 32,
              level: 'NOMINAL RISK',
              levelColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
              precursors: 16,
              topBarrier: 'ESD Solenoid Valve (14%)',
              inspections: 320,
              contractorShare: '40%'
            },
          ].map((site) => (
            <div key={site.name} className="cad-card-interactive p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold">{site.type}</span>
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${site.levelColor}`}>
                    {site.level}
                  </span>
                </div>
                <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900 leading-snug">
                  {site.name}
                </h3>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Risk Composite Index:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{site.riskScore} / 100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Curated SIF Precursors (Demo):</span>
                  <span className="font-mono font-bold text-red-600">{site.precursors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Top Vulnerability:</span>
                  <span className="font-semibold text-slate-800">{site.topBarrier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Contractor Crew Ratio:</span>
                  <span className="font-mono text-slate-700 font-medium">{site.contractorShare}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/reports?facility=' + encodeURIComponent(site.name))}
                className="w-full h-9 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>View Incident Stream</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ACTIVITY VULNERABILITY MATRIX SECTION */}
      <section className="cad-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-['Public_Sans'] font-bold text-lg text-slate-900">
              High-Risk Operational Activity Vulnerability Matrix
            </h2>
            <p className="text-xs text-slate-500">Breakdown by task classification and SIF precursor frequency</p>
          </div>
          <span className="font-mono text-xs text-slate-500">CROSS-SITE AUDIT</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              title: 'Maintenance Overhaul',
              count: 48,
              risk: 'CRITICAL SIF VULNERABILITY',
              color: 'border-l-red-600 bg-red-50/10',
              badge: 'bg-red-100 text-red-700',
              factors: ['Stored pressure release', 'LOTO bypass during handover', 'Flange bolt premature removal']
            },
            {
              title: 'Drilling & Workover',
              count: 36,
              risk: 'HIGH SIF VULNERABILITY',
              color: 'border-l-orange-500 bg-orange-50/10',
              badge: 'bg-orange-100 text-orange-700',
              factors: ['Rotary line-of-fire', 'Dropped tubular tools', 'Tong recoil & cable fatigue']
            },
            {
              title: 'Confined Space & Tank Entry',
              count: 24,
              risk: 'HIGH SIF VULNERABILITY',
              color: 'border-l-amber-500 bg-amber-50/10',
              badge: 'bg-amber-100 text-amber-700',
              factors: ['H2S atmospheric buildup', 'Calibration lapse on detectors', 'Rescue gear readiness']
            },
            {
              title: 'Hot Work & Flange Bolting',
              count: 18,
              risk: 'MODERATE SIF VULNERABILITY',
              color: 'border-l-blue-600 bg-blue-50/10',
              badge: 'bg-blue-100 text-blue-700',
              factors: ['Spark containment curtains', 'Continuous LEL monitoring', 'Fire watch handovers']
            },
          ].map((act) => (
            <div key={act.title} className={`cad-card p-5 border-l-4 ${act.color} space-y-4`}>
              <div className="space-y-1">
                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${act.badge}`}>
                  {act.risk}
                </span>
                <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900 pt-1">
                  {act.title}
                </h3>
                <div className="font-mono text-xs font-semibold text-slate-500">
                  {act.count} Precursor Events Flagged
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Primary Causal Factors:</span>
                <ul className="space-y-1 list-disc list-inside">
                  {act.factors.map((f) => (
                    <li key={f} className="text-slate-700">{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
