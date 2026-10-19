import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ExportDossierPage() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [selectedFormat, setSelectedFormat] = useState('PDF');
  const [selectedFacility, setSelectedFacility] = useState('All');
  const [isExporting, setIsExporting] = useState(false);
  const [sections, setSections] = useState({
    executiveSummary: true,
    sifPrecursors: true,
    bowtieBarriers: true,
    whatIfProjections: true,
    auditTrail: false,
  });

  const toggleSection = (key) => {
    setSections({ ...sections, [key]: !sections[key] });
  };

  const handleExportDossier = (title) => {
    showToast(`Compiling safety dossier: ${title}...`);
    setTimeout(() => {
      showToast(`Export complete: ${title} downloaded.`);
    }, 1000);
  };

  const handleCustomExport = (e) => {
    e.preventDefault();
    setIsExporting(true);
    showToast('Compiling safety intelligence dossier package...');
    setTimeout(() => {
      setIsExporting(false);
      showToast('Custom Safety Intelligence Dossier generated successfully.');
    }, 1200);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded tracking-wide">
              EXPORT-ENGINE
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">download</span>
              Executive Safety Dossiers & Prototype HSE Analysis Packages
            </span>
          </div>
          <h1 className="font-['Public_Sans'] font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Executive Safety Dossiers & Reporting Engine
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Generate standardized safety intelligence dossiers for HSE committee reviews, safety guideline alignment briefings, and regional asset management audits.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start lg:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base text-slate-500">dashboard</span>
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* READY-MADE HSE DOSSIER TEMPLATES (4 COLS) */}
      <section className="space-y-4">
        <div>
          <h2 className="font-['Public_Sans'] font-bold text-lg text-slate-900">
            Standard Safety Dossier Templates
          </h2>
          <p className="text-xs text-slate-500">Standardized formats pre-configured for internal HSE governance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              title: 'Executive Board SIF Intelligence Dossier',
              period: 'Q3 2026 Board Cycle',
              format: 'Executive PDF + Slide Deck',
              desc: 'High-level synthesis of SIF precursor frequencies, defense degradation, and top exposure vectors.',
              badge: 'BOARD PACK'
            },
            {
              title: 'Safety Compliance Template Package (Prototype)',
              period: 'Quarterly Safety Review Package',
              format: 'Standardized PDF',
              desc: 'Standard compliance template aligned with barrier integrity and Life-Saving Rule criteria.',
              badge: 'COMPLIANCE'
            },
            {
              title: 'Asset Operational Barrier Health Brief',
              period: 'Duliajan Drilling Rig #4',
              format: 'Technical PDF + Excel',
              desc: 'Asset-specific Bow-Tie barrier defense matrix, mechanical isolation audits, and open actions.',
              badge: 'ASSET BRIEF'
            },
            {
              title: 'AI Model Transparency & Governance Ledger',
              period: 'Baseline Hybrid NLP Governance',
              format: 'JSON Schema + PDF',
              desc: 'Full audit ledger of human-in-the-loop reviews, NLP feature extraction paths, and baseline model evaluation.',
              badge: 'GOVERNANCE'
            },
          ].map((dossier) => (
            <div key={dossier.title} className="cad-card-interactive p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    {dossier.badge}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{dossier.period}</span>
                </div>
                <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900 leading-snug">
                  {dossier.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {dossier.desc}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-mono text-slate-500 block">Format: {dossier.format}</span>
                <button
                  onClick={() => handleExportDossier(dossier.title)}
                  className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Export Package</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CUSTOM DOSSIER BUILDER */}
      <section className="cad-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-['Public_Sans'] font-bold text-lg text-slate-900">
              Custom Safety Dossier Compiler
            </h2>
            <p className="text-xs text-slate-500">Select specific modules, facilities, and reporting formats</p>
          </div>
          <span className="font-mono text-xs text-slate-500">ON-DEMAND COMPILER</span>
        </div>

        <form onSubmit={handleCustomExport} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scope / Facility */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Target Operational Facility Scope
              </label>
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="All">All Facilities (Site A, Site B, Duliajan Basin)</option>
                <option value="Duliajan">Duliajan Drilling Complex (Rig #4)</option>
                <option value="Moran">Moran Exploration Hub & Tank Farm</option>
                <option value="Digboi">Digboi Refinery Feeder Line 9</option>
              </select>
            </div>

            {/* Output Format */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Reporting Output Format
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="PDF">Executive Safety PDF Document</option>
                <option value="CSV">Raw Observations & Barrier Dataset (CSV / Excel)</option>
                <option value="JSON">HSE Intelligence JSON Schema</option>
                <option value="SLIDES">Executive Board Briefing Slide Deck</option>
              </select>
            </div>

            {/* Audit Status */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Review Audit Stamp
              </label>
              <div className="h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono text-slate-600">
                <span>Prototype Audit Stamp (HSE Review)</span>
                <span className="text-emerald-600 font-bold">READY</span>
              </div>
            </div>
          </div>

          {/* Module Selectors */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
              Include Dossier Intelligence Sections:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {[
                { key: 'executiveSummary', label: 'Executive Summary & KPIs' },
                { key: 'sifPrecursors', label: 'SIF Precursor Incident Logs' },
                { key: 'bowtieBarriers', label: 'Bow-Tie Defense Matrix' },
                { key: 'whatIfProjections', label: 'Scenario Safety Assessment' },
                { key: 'auditTrail', label: 'Human Governance Audit Trail' },
              ].map((sec) => (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => toggleSection(sec.key)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                    sections[sec.key]
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <span className="truncate">{sec.label}</span>
                  <span className="material-symbols-outlined text-base">
                    {sections[sec.key] ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Generated prototype dossier is formatted according to standard safety reporting templates.
            </div>

            <button
              type="submit"
              disabled={isExporting}
              className="h-11 px-6 bg-[#0F1E36] hover:bg-[#162B4D] disabled:bg-slate-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {isExporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Compiling Package...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base text-blue-300">download</span>
                  <span>Generate Safety Intelligence Dossier</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
