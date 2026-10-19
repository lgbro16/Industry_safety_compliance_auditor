import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getApiUrl } from '../config/api';

export default function PatternIntelligencePage() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  // Scenario Assessment Sliders
  const [ambientTemp, setAmbientTemp] = useState(38);
  const [fatigueFactor, setFatigueFactor] = useState(7);
  const [contractorRatio, setContractorRatio] = useState(65);
  const [simopsCount, setSimopsCount] = useState(3);
  const [daysSinceInspection, setDaysSinceInspection] = useState(24);

  // Barrier Toggles
  const [mechanicalIsolation, setMechanicalIsolation] = useState(false);
  const [calibratedDetector, setCalibratedDetector] = useState(false);
  const [ventilationActive, setVentilationActive] = useState(true);
  const [holeWatchAssigned, setHoleWatchAssigned] = useState(true);

  // Dynamic SIF calculation index
  let calculatedSif = 25;
  if (!mechanicalIsolation) calculatedSif += 32;
  if (!calibratedDetector) calculatedSif += 24;
  if (!ventilationActive) calculatedSif += 16;
  if (!holeWatchAssigned) calculatedSif += 14;
  if (ambientTemp > 35) calculatedSif += 8;
  if (contractorRatio > 50) calculatedSif += 6;
  if (fatigueFactor > 6) calculatedSif += 6;
  if (simopsCount > 2) calculatedSif += 7;
  calculatedSif = Math.min(Math.max(calculatedSif, 6), 98);

  const getRiskStatus = (score) => {
    if (score >= 80) return { label: 'CRITICAL SIF RISK', color: 'bg-red-100 text-red-700 border-red-200' };
    if (score >= 50) return { label: 'ELEVATED RISK', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    return { label: 'CONTROLLED NOMINAL', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  const riskStatus = getRiskStatus(calculatedSif);

  // Dynamic clusters from API
  const [clusters, setClusters] = useState([
    {
      cluster: 'Cluster Pattern #1',
      title: 'Incomplete Electrical & Stored Energy Isolation During Centrifugal Pump Overhaul',
      count: 14,
      sites: 'Duliajan Rig #4, Moran Central',
      risk: 'CRITICAL',
      desc: 'Technicians consistently verify electrical breakers but skip mechanical pressure bleed-down when bypass valves are stiff or corroded.'
    },
    {
      cluster: 'Cluster Pattern #2',
      title: 'Confined Space Entry with Expired Multi-Gas Detector Bump Calibration',
      count: 9,
      sites: 'Moran Tank Farm, Nahorkatiya',
      risk: 'HIGH SIF',
      desc: 'Contract cleaning crews entering vessels without mandatory bump-testing, relying on sensors past calibration intervals.'
    },
    {
      cluster: 'Cluster Pattern #3',
      title: 'Rig Derrick Floor Line-of-Fire & Dropped Objects During Tubular Hoisting',
      count: 6,
      sites: 'Duliajan Rig #4, Digboi Feeder',
      risk: 'HIGH SIF',
      desc: 'Tethering cords omitted on secondary breakout tongs during rapid tripping operations, exposing floormen to impact hazards.'
    },
  ]);

  useEffect(() => {
    fetch(getApiUrl('/api/patterns'))
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.clusters && data.clusters.length > 0) {
          const apiClusters = data.clusters.map((c, idx) => ({
            cluster: `Cluster Pattern #${idx + 1}`,
            title: c.title || `Pattern: ${c.top_terms?.slice(0, 3).join(', ')}`,
            count: c.report_count || 0,
            sites: 'OIL Exploration & Production Assets',
            risk: (c.precursor_ratio || 0) > 0.6 ? 'CRITICAL' : 'HIGH SIF',
            desc: c.representative_reports?.[0]
              ? `Key incident: "${c.representative_reports[0].substring(0, 140)}..."`
              : `Top semantic indicators: ${c.top_terms?.join(', ')}`
          }));
          setClusters(apiClusters);
        }
      })
      .catch(() => {
        // Fallback to prototype default clusters
      });
  }, []);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded tracking-wide">
              SCENARIO-ASSESSMENT
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">hub</span>
              Multi-Site Pattern Detection & Scenario-Based Safety Assessment
            </span>
          </div>
          <h1 className="font-['Public_Sans'] font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Pattern Detection & Scenario-Based Safety Assessment
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Uncover systemic failure patterns across independent facilities. Use interactive scenario assessments to evaluate barrier permutations before commencing high-risk tasks.
          </p>
        </div>

        <button
          onClick={() => {
            showToast('Scenario parameters reset to nominal baseline');
            setAmbientTemp(28);
            setContractorRatio(30);
            setFatigueFactor(2);
            setSimopsCount(1);
            setMechanicalIsolation(true);
            setCalibratedDetector(true);
            setVentilationActive(true);
            setHoleWatchAssigned(true);
          }}
          className="h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start lg:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base text-slate-500">restart_alt</span>
          <span>Reset to Nominal Baseline</span>
        </button>
      </div>

      {/* SECTION 1: SCENARIO-BASED SAFETY ASSESSMENT (DUAL COLUMN WORKSPACE) */}
      <section className="cad-card p-6 sm:p-8 space-y-8 border-l-4 border-l-blue-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-700 text-2xl">science</span>
              <h2 className="font-['Public_Sans'] font-bold text-xl text-slate-900">
                Interactive Scenario-Based Safety Assessment
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Scenario: Technician entering Crude Storage Tank TK-104 for sediment desludging under varying fatigue and barrier defenses.
            </p>
          </div>
          <span className="font-mono text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200">
            SCENARIO-BASED SAFETY ANALYSIS
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* SLIDERS & CONTROLS (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-600">
              1. Adjust Operational Stress Factors:
            </h3>

            <div className="space-y-5 bg-slate-50 p-6 rounded-xl border border-slate-200">
              {/* Slider 1: Ambient Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Ambient Surface Temperature:</span>
                  <span className="font-mono font-bold text-slate-900">{ambientTemp}°C</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="48"
                  value={ambientTemp}
                  onChange={(e) => setAmbientTemp(Number(e.target.value))}
                  className="w-full accent-blue-700 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>20°C (Mild)</span>
                  <span>35°C (Heat Stress)</span>
                  <span>48°C (Extreme Thermal Load)</span>
                </div>
              </div>

              {/* Slider 2: Shift Handover Fatigue */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Shift Handover Fatigue Factor (0-10):</span>
                  <span className="font-mono font-bold text-slate-900">{fatigueFactor} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={fatigueFactor}
                  onChange={(e) => setFatigueFactor(Number(e.target.value))}
                  className="w-full accent-blue-700 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>1 (Fresh Crew)</span>
                  <span>5 (Standard Shift)</span>
                  <span>10 (Consecutive 14h Handover)</span>
                </div>
              </div>

              {/* Slider 3: Contractor Ratio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Contractor Crew Workforce Ratio (%):</span>
                  <span className="font-mono font-bold text-slate-900">{contractorRatio}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={contractorRatio}
                  onChange={(e) => setContractorRatio(Number(e.target.value))}
                  className="w-full accent-blue-700 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>10% (Permanent Core Staff)</span>
                  <span>50% (Mixed Team)</span>
                  <span>90% (Transient Contractors)</span>
                </div>
              </div>

              {/* Slider 4: SIMOPS Concurrent Operations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Simultaneous Operations (SIMOPS) in Corridor:</span>
                  <span className="font-mono font-bold text-slate-900">{simopsCount} Concurrent Jobs</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={simopsCount}
                  onChange={(e) => setSimopsCount(Number(e.target.value))}
                  className="w-full accent-blue-700 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
              </div>

              {/* Slider 5: Days Since Barrier Recalibration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Days Since Safety Barrier Recalibration:</span>
                  <span className="font-mono font-bold text-slate-900">{daysSinceInspection} Days Ago</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={daysSinceInspection}
                  onChange={(e) => setDaysSinceInspection(Number(e.target.value))}
                  className="w-full accent-blue-700 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>1 Day (Freshly Recalibrated)</span>
                  <span>30 Days (Due)</span>
                  <span>60 Days (Critical Backlog)</span>
                </div>
              </div>
            </div>

            {/* BARRIER COMBINATION TOGGLES */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-600">
                2. Test Active Safety Barrier Combinations:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Barrier 1 */}
                <button
                  type="button"
                  onClick={() => setMechanicalIsolation(!mechanicalIsolation)}
                  className={`p-3.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                    mechanicalIsolation
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <div>
                    <div>Double Block & Bleed Verified</div>
                    <div className="text-[10px] text-slate-500 font-normal">Physical line isolation</div>
                  </div>
                  <span className="font-mono text-xs font-extrabold">{mechanicalIsolation ? 'ACTIVE' : 'BYPASSED'}</span>
                </button>

                {/* Barrier 2 */}
                <button
                  type="button"
                  onClick={() => setCalibratedDetector(!calibratedDetector)}
                  className={`p-3.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                    calibratedDetector
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <div>
                    <div>Personal 4-Gas Bump Tested</div>
                    <div className="text-[10px] text-slate-500 font-normal">H2S & LEL sensor valid</div>
                  </div>
                  <span className="font-mono text-xs font-extrabold">{calibratedDetector ? 'ACTIVE' : 'EXPIRED'}</span>
                </button>

                {/* Barrier 3 */}
                <button
                  type="button"
                  onClick={() => setVentilationActive(!ventilationActive)}
                  className={`p-3.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                    ventilationActive
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <div>
                    <div>Positive Forced Extraction</div>
                    <div className="text-[10px] text-slate-500 font-normal">Air blower running</div>
                  </div>
                  <span className="font-mono text-xs font-extrabold">{ventilationActive ? 'ACTIVE' : 'FAILED'}</span>
                </button>

                {/* Barrier 4 */}
                <button
                  type="button"
                  onClick={() => setHoleWatchAssigned(!holeWatchAssigned)}
                  className={`p-3.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                    holeWatchAssigned
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <div>
                    <div>Hole Watch / Standby Person</div>
                    <div className="text-[10px] text-slate-500 font-normal">Continuous hatch vigil</div>
                  </div>
                  <span className="font-mono text-xs font-extrabold">{holeWatchAssigned ? 'PRESENT' : 'ABSENT'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* SCENARIO RISK INDEX GAUGE (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="cad-card p-6 sm:p-7 border-t-4 border-t-red-600 bg-gradient-to-br from-white to-slate-50 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-mono text-xs font-bold text-slate-500 uppercase">
                  SCENARIO EVALUATION
                </span>
                <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded border ${riskStatus.color}`}>
                  {riskStatus.label}
                </span>
              </div>

              {/* Dynamic Score Display */}
              <div className="text-center space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Scenario Risk Index
                </div>
                <div className="font-['Public_Sans'] font-black text-5xl sm:text-6xl text-slate-900 tracking-tight transition-all duration-300">
                  {calculatedSif}%
                </div>
                <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                  Scenario risk index under selected operational conditions and active barrier status.
                </p>
              </div>

              {/* Projected Failure Trajectory */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-600 text-base">analytics</span>
                  <span>Primary Predicted Failure Vector:</span>
                </div>
                <p className="text-slate-700 leading-snug">
                  {!mechanicalIsolation
                    ? 'Hydrocarbon line backpressure release during tank flange crack.'
                    : !calibratedDetector
                    ? 'Asymptomatic toxic gas (H2S >15ppm) buildup leading to worker loss of consciousness.'
                    : !ventilationActive
                    ? 'Thermal exhaustion accelerating cognitive degradation and procedural shortcuts.'
                    : 'Systemic baseline risk within acceptable ALARP boundary.'}
                </p>
              </div>

              {/* Prescribed Operational Interlocks */}
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                  Mandated Operational Interlocks:
                </div>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                    <span>Lockout/Tagout permit digital barcode release</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                    <span>Continuous atmospheric bump test telemetry stream</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                    <span>Enforce maximum 45-minute tank rotation intervals</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: RECURRING MULTI-SITE SIF PATTERNS */}
      <section className="space-y-6">
        <div>
          <h2 className="font-['Public_Sans'] font-bold text-xl text-slate-900">
            Identified Multi-Site Recurring SIF Patterns
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Systemic clusters discovered through NLP semantic clustering (Sentence Transformers + K-Means) across the OIL safety report prototype dataset.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {clusters.map((c) => (
            <div key={c.cluster} className="cad-card-interactive p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-blue-700">{c.cluster}</span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded border border-red-200">
                    {c.risk}
                  </span>
                </div>
                <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900 leading-snug">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {c.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Incident Occurrences:</span>
                  <span className="font-mono font-bold text-slate-900">{c.count} Reports in Cluster</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Affected Asset Sites:</span>
                  <span className="font-medium text-slate-800">{c.sites}</span>
                </div>
                <button
                  onClick={() => navigate('/reports')}
                  className="w-full h-9 mt-2 bg-slate-100 hover:bg-[#0F1E36] hover:text-white text-slate-800 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Inspect Pattern Evidence</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
