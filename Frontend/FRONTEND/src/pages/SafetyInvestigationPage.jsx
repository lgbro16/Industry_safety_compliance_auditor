import React, { useState, useEffect } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import { getApiUrl } from '../config/api';
import { useApp } from '../context/AppContext';

export default function SafetyInvestigationPage() {
  const { showToast } = useApp();
  const [searchParams] = useSearchParams();

  const presets = {
    confined_space: {
      title: 'Confined Space Separator Entry',
      facility: 'Digboi Central Tank Farm',
      text: 'Contractor entered high-pressure crude separator V-102 to conduct sludge scraping without documented multi-gas atmospheric testing. The 4-gas portable monitor GD-PORT-09 calibration was expired, and no designated safety attendant was positioned outside the manway.'
    },
    crane_lift: {
      title: 'Crane Proof Load & SIMOPS Rigging',
      facility: 'Drilling Rig #04 (Moran Field)',
      text: 'During workover operations, the crew utilized mobile hydraulic crane CR-04 to hoist heavy drill collars over an energized hydrocarbon flowline. The rigging wire rope exhibited visible strand flattening, and no lifting exclusion zone barricades were erected.'
    },
    loto_bypass: {
      title: 'Lockout/Tagout Isolation Failure',
      facility: 'Wellhead Platform 12',
      text: 'Technician serviced electrical booster pump motor MTR-201A mechanical seals after only tripping the local disconnect switch. No physical padlock hasp was affixed to the MCC breaker, and zero-energy state verification was not documented prior to dismantling.'
    },
    scaffold_height: {
      title: 'Work-at-Height Scaffolding Hazard',
      facility: 'Flare Header Pipe Rack',
      text: 'Insulation crew erected a 14-foot modular tower SCF-MOD-B without mid-rails and toe-boards. Workers performed welding at height with single lanyards tied to non-rated cable trays, and the weekly green Scafftag inspection was missing.'
    }
  };

  const [reportText, setReportText] = useState(presets.confined_space.text);
  const [facility, setFacility] = useState(presets.confined_space.facility);
  const [forceResearch, setForceResearch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('findings'); // 'findings' | 'provenance' | 'precursors'

  useEffect(() => {
    const presetKey = searchParams.get('preset');
    if (presetKey && presets[presetKey]) {
      setReportText(presets[presetKey].text);
      setFacility(presets[presetKey].facility);
    }
  }, [searchParams]);

  const handleRunInvestigation = async (e) => {
    e?.preventDefault();
    if (!reportText.trim()) {
      showToast('Please enter an observation or incident report.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(getApiUrl('/api/audit/investigate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: reportText,
          facility: facility,
          force_external_research: forceResearch,
          actor: 'Lead HSE Safety Auditor'
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Investigation failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      setResult(json);
      showToast('Compliance audit and external correlation completed.');
    } catch (err) {
      console.error('Investigation error:', err);
      setError(err.message || 'Failed to complete safety compliance investigation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Title & Description */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">
            AUTONOMOUS INVESTIGATION STUDIO
          </span>
          <span className="text-slate-400 text-xs">•</span>
          <span className="text-xs text-slate-500 font-mono">TinyFish Search & Fetch Powered</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold font-['Public_Sans'] text-slate-900 tracking-tight">
          Industrial Safety & Compliance Investigation
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Enter an incident report, near-miss, or unsafe observation. The platform evaluates SIF risk, initiates TinyFish autonomous regulatory discovery on approved official domains, and synthesizes evidence-backed candidate findings.
        </p>
      </div>

      {/* Preset Scenario Quick-Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-3 rounded-xl border border-slate-200">
        <span className="text-xs font-mono font-bold text-slate-500 mr-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">bookmark</span> Sample Presets:
        </span>
        {Object.entries(presets).map(([key, p]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setReportText(p.text);
              setFacility(p.facility);
              showToast(`Loaded preset: ${p.title}`);
            }}
            className="px-3 py-1 text-xs font-medium bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg border border-slate-200 shadow-sm transition-colors"
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Input Form Card */}
      <form onSubmit={handleRunInvestigation} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Industrial Installation / Facility
            </label>
            <input
              type="text"
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              placeholder="e.g. Digboi Central Tank Farm, Rig #04"
            />
          </div>

          <div className="flex items-center justify-between md:justify-end md:gap-4 pt-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceResearch}
                onChange={(e) => setForceResearch(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Force TinyFish External Research (Bypass threshold)
              </span>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
              Observation Narrative / Incident Description
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              {reportText.length} characters
            </span>
          </div>
          <textarea
            rows={5}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans leading-relaxed"
            placeholder="Describe the unsafe act, barrier failure, or equipment condition observed on site..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>External search restricted to allowlisted official authorities (OSHA, DGMS, HSE, NFPA)</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm transition-all shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Executing AI Compliance Audit...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">play_arrow</span>
                <span>Run Compliance Audit</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600 mt-0.5">error</span>
          <div>
            <strong className="font-semibold">Investigation Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Investigation Results Display */}
      {result && (
        <div className="space-y-6 pt-4">
          {/* Top Summary Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 font-mono text-xs font-extrabold rounded-md uppercase tracking-wider ${
                  result.risk_level === 'CRITICAL' ? 'bg-red-600 text-white' :
                  result.risk_level === 'HIGH' ? 'bg-amber-600 text-white' :
                  'bg-blue-600 text-white'
                }`}>
                  {result.risk_level} SIF POTENTIAL
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Risk Score: <strong className="text-slate-800">{(result.risk_score * 100).toFixed(1)}%</strong>
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs text-slate-600 font-medium">
                  Rule: <strong>{result.lsr?.rule || 'General Safety'}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                {new Date(result.investigation_timestamp).toLocaleTimeString()}
              </div>
            </div>

            {/* Directive & Grounded Explanation */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-mono font-bold text-slate-700 uppercase block mb-1">
                  Required Operational Action
                </span>
                <p className="text-slate-800 font-medium">{result.action || result.recommendation}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200">
                <span className="font-mono font-bold text-blue-800 uppercase block mb-1">
                  Grounded Safety Rationale
                </span>
                <p className="text-slate-700">{result.explanation}</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('findings')}
              className={`px-4 py-2.5 text-xs font-semibold font-mono tracking-wide border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'findings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-base">fact_check</span>
              Candidate Findings ({result.candidate_findings?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('provenance')}
              className={`px-4 py-2.5 text-xs font-semibold font-mono tracking-wide border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'provenance'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-base">compare_arrows</span>
              Internal vs External Provenance
            </button>

            <button
              onClick={() => setActiveTab('precursors')}
              className={`px-4 py-2.5 text-xs font-semibold font-mono tracking-wide border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'precursors'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-base">hub</span>
              Extracted Factors & Barriers
            </button>
          </div>

          {/* Tab 1: Candidate Findings */}
          {activeTab === 'findings' && (
            <div className="space-y-4">
              {result.candidate_findings?.length > 0 ? (
                result.candidate_findings.map((f, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                          f.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                          f.severity === 'HIGH' ? 'bg-amber-600 text-white' :
                          'bg-blue-600 text-white'
                        }`}>
                          {f.severity}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">
                          {f.status || 'CANDIDATE'}
                        </span>
                        <span className="text-xs font-mono text-slate-500">{f.id}</span>
                      </div>

                      <NavLink
                        to="/findings"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded shadow-sm transition-colors"
                      >
                        Review in Queue →
                      </NavLink>
                    </div>

                    <div>
                      <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900">{f.title}</h3>
                      <p className="text-xs text-slate-600 mt-1">{f.description}</p>
                    </div>

                    {/* Verifiable Excerpt Quote Box */}
                    <div className="p-4 rounded-lg bg-amber-50/50 border-l-4 border-amber-500 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-amber-900">
                          STATUTORY REGULATION: {f.applicable_regulation}
                        </span>
                        {f.source_url && (
                          <a
                            href={f.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <span>{f.source_domain || 'Official Source'}</span>
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                          </a>
                        )}
                      </div>
                      <blockquote className="text-xs italic text-slate-800 font-mono leading-relaxed">
                        "{f.verified_excerpt}"
                      </blockquote>
                      <div className="text-[10px] font-mono text-slate-500 pt-1">
                        Provenance: Extracted directly from official document body via TinyFish Fetch.
                      </div>
                    </div>

                    {/* Uncertainty & Recommended Action */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="font-mono font-bold text-slate-500 uppercase block mb-1">
                          Uncertainty Assessment ({f.uncertainty_score})
                        </span>
                        <p className="text-slate-700">{f.uncertainty_rationale}</p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="font-mono font-bold text-slate-500 uppercase block mb-1">
                          Recommended Follow-Up
                        </span>
                        <p className="text-slate-700 font-medium">{f.recommended_action}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                  No candidate compliance gaps detected matching current trigger criteria.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Internal vs External Provenance */}
          {activeTab === 'provenance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Internal RAG Evidence */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="material-symbols-outlined text-blue-600">home_work</span>
                  <h3 className="font-bold text-sm text-slate-900 font-['Public_Sans']">
                    Internal Standards (Oil India / IOGP)
                  </h3>
                </div>

                <div className="space-y-3">
                  {result.internal_evidence?.map((ev, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-blue-700 text-[11px]">
                        <span>{ev.source}</span>
                        <span>{ev.section}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-sans">{ev.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* External TinyFish Regulatory Evidence */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600">travel_explore</span>
                    <h3 className="font-bold text-sm text-slate-900 font-['Public_Sans']">
                      External Regulatory Evidence (TinyFish)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    {result.external_research?.mode || 'TINYFISH'}
                  </span>
                </div>

                <div className="space-y-3">
                  {result.external_research?.fetched_documents?.map((doc, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                        <span className="font-bold text-slate-700">{doc.title}</span>
                        <span>v{doc.version || 1}</span>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline truncate block font-mono"
                      >
                        {doc.url}
                      </a>
                      <div className="text-[11px] text-slate-600 font-mono bg-white p-2 rounded border border-slate-200 max-h-32 overflow-y-auto">
                        {doc.text?.substring(0, 300)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Precursors & Factors */}
          {activeTab === 'precursors' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 font-['Public_Sans'] pb-3 border-b border-slate-100">
                Structured Precursor Extraction (SIF-Guard Core)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-mono font-bold text-slate-500 uppercase block mb-1">Identified Activity</span>
                  <span className="font-semibold text-slate-800">{result.precursors?.activity || 'Routine maintenance'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-mono font-bold text-slate-500 uppercase block mb-1">Primary Hazards</span>
                  <span className="font-semibold text-slate-800">{result.precursors?.hazards?.join(', ') || 'Process hazard'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-mono font-bold text-slate-500 uppercase block mb-1">Compromised Barriers</span>
                  <span className="font-semibold text-slate-800">{result.precursors?.barriers?.join(', ') || 'Procedural'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-mono font-bold text-slate-500 uppercase block mb-1">Potential Consequence</span>
                  <span className="font-semibold text-slate-800">{result.precursors?.consequences || 'Personnel injury'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Legal Governance Notice */}
          <div className="p-4 rounded-xl bg-slate-100 text-slate-600 text-xs font-mono leading-relaxed border border-slate-200">
            <strong>GOVERNANCE NOTICE:</strong> {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
