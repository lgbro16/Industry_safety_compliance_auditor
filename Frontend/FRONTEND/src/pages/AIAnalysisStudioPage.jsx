import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getApiUrl } from '../config/api';

export default function AIAnalysisStudioPage() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const presets = [
    {
      title: "SIH-26165 Mandated Demo: Separator V-102 Sludge Removal (Pump Station 4)",
      facility: "Separator Vessel V-102, Pump Station 4",
      activity: "Sludge removal",
      pressure: "Atmospheric",
      gas: "H2S & O2 Untested",
      temp: "32°C",
      shift: "Day Maintenance Handover",
      text: "Worker entered separator vessel V-102 at Pump Station 4 for sludge removal without conducting mandatory atmospheric gas testing for H2S and O2 levels. No standby person was present at the manhole."
    },
    {
      title: "Energy Isolation Failure (Pump P-302)",
      facility: "Duliajan Drilling Complex (Rig #4)",
      activity: "Mechanical Maintenance / Pump Overhaul",
      pressure: "42 bar",
      gas: "0.0 ppm",
      temp: "34°C",
      shift: "Night Handover",
      text: "During night shift maintenance on Pump P-302 at Duliajan Rig #4, mechanical technicians unbolted the casing flange before completing the mechanical double-block-and-bleed isolation verification. The electrical breaker was tagged out, but the upstream bypass valve remained partially cracked under 42 bar residual line pressure. Fluid spray was averted when the lead operator noticed pressure gauge PG-102 reading 600 PSI before final flange stud removal."
    },
    {
      title: "H2S Detector Calibration Drift (Tank TK-104)",
      facility: "Moran Exploration Hub",
      activity: "Confined Space Entry & Tank Cleaning",
      pressure: "Atmospheric (1.0 bar)",
      gas: "18.4 ppm (Fault Code ERR-04)",
      temp: "39°C",
      shift: "Morning Handover",
      text: "During routine morning handover at Moran Central Tank Farm, the fixed H2S detection unit near Crude Tank TK-104 displayed a sensor drift fault code ERR-04. Two contract cleaning technicians were already suiting up to enter the diked area without portable personal gas monitors and without valid gas tester sign-off on the active confined space permit."
    },
    {
      title: "Crane Wire Rope Strand Disruption (Line 9)",
      facility: "Digboi Refinery Feeder",
      activity: "Heavy Lift & SIMOPS",
      pressure: "28 bar",
      gas: "0.0 ppm",
      temp: "31°C",
      shift: "Day Shift Operations",
      text: "During simultaneous heavy lift operations at Digboi Feeder Line 9, riggers hoisted a 14-ton separator spool over the active pressurised hydrocarbon pipeline header. An inspector identified 3 severed outer wire strands on the primary crane hoist wire rope, with no drop exclusion perimeter demarcated beneath the suspended load corridor."
    }
  ];

  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [transcriptInput, setTranscriptInput] = useState(presets[0].text);
  const reportText = transcriptInput;
  const setReportText = setTranscriptInput;

  const [facility, setFacility] = useState(presets[0].facility);
  const [activity, setActivity] = useState(presets[0].activity);
  const [pressure, setPressure] = useState(presets[0].pressure);
  const [gasLevel, setGasLevel] = useState(presets[0].gas);
  const [temperature, setTemperature] = useState(presets[0].temp);
  const [shift, setShift] = useState(presets[0].shift);

  // Analysis State Machine: 'idle', 'analyzing', 'completed', 'error'
  const [analysisState, setAnalysisState] = useState('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [analysisError, setAnalysisError] = useState(null);

  // Directly updated component state variables from server.py response JSON
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('LOW');
  const [riskColor, setRiskColor] = useState('GREEN');
  const [sifPotential, setSifPotential] = useState(false);
  const [action, setAction] = useState('Awaiting analysis...');
  const [lifeSavingRules, setLifeSavingRules] = useState([]);
  const [aiExplanation, setAiExplanation] = useState('');
  const [barrierFailures, setBarrierFailures] = useState([]);
  const [precursors, setPrecursors] = useState({});
  const [analysisResult, setAnalysisResult] = useState(null);

  const reasoningSteps = [
    { num: '01', key: 'INGEST', title: 'Verbatim Narrative Ingestion', desc: 'Synthesizing incident context & NLP token extraction' },
    { num: '02', key: 'EVIDENCE', title: 'Hazard & Energy Mapping', desc: 'Isolating stored pressure, toxic gas, or kinetic energy' },
    { num: '03', key: 'DEFENSE', title: 'Barrier Degradation Audit', desc: 'Detecting failed safety barriers and isolation bypasses' },
    { num: '04', key: 'VULNERABILITY', title: 'Life-Saving Rule Evaluation', desc: 'Classifying IOGP Life-Saving Rules violations' },
    { num: '05', key: 'SCENARIO', title: 'Scenario Safety Trajectory', desc: 'Scenario-based assessment of plausible consequence envelope' },
    { num: '06', key: 'VERDICT', title: 'SIF Precursor Determination', desc: 'Hybrid evaluation: Baseline ML risk scoring & RAG grounding complete' },
  ];

  // Async function sending POST request to http://localhost:5000/api/analyze passing { text: transcriptInput }
  const handleAnalyze = async (customText) => {
    const textToSend = typeof customText === 'string' ? customText : transcriptInput;
    if (!textToSend || !textToSend.trim()) {
      showToast('Please enter an observation report to analyze');
      return;
    }

    setAnalysisState('analyzing');
    setAnalysisError(null);
    setCurrentStepIndex(1);
    showToast('Analyzing Report with Safety AI Engine...');

    // Progress stepper animation during API request
    let step = 1;
    const interval = setInterval(() => {
      if (step < 5) {
        step += 1;
        setCurrentStepIndex(step);
      }
    }, 350);

    try {
      let response = null;
      try {
        response = await fetch(getApiUrl('/api/analyze'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSend })
        });
      } catch {
        response = null;
      }

      if (!response || !response.ok) {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (isLocal && !import.meta.env.VITE_API_BASE_URL) {
          try {
            response = await fetch('http://127.0.0.1:5000/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: textToSend })
            });
          } catch {
            // Keep response as previous result to report accurate proxy failure
          }
        }
      }

      if (!response || !response.ok) {
        const errJson = await response?.json().catch(() => null);
        throw new Error(errJson?.error || `API returned status ${response?.status || 'network failure'}`);
      }

      const data = await response.json();

      clearInterval(interval);
      setCurrentStepIndex(6);

      // Directly update state variables with the response JSON from server.py (no mock override)
      setRiskScore(typeof data.risk_score === 'number' ? data.risk_score : 0);
      setRiskLevel(data.risk_level || (data.sif_potential ? 'HIGH' : 'LOW'));
      setRiskColor(data.risk_color || 'GREEN');
      setSifPotential(Boolean(data.sif_potential));
      setAction(data.action || '');
      setLifeSavingRules(Array.isArray(data.lsr_tags) ? data.lsr_tags : []);
      setAiExplanation(data.explanation || '');
      setBarrierFailures(Array.isArray(data.precursors?.barrier_failure) ? data.precursors.barrier_failure : []);
      setPrecursors(data.precursors || {});
      setAnalysisResult(data);

      // Update telemetry if extracted from report precursors
      if (data.precursors?.location) {
        setFacility(Array.isArray(data.precursors.location) ? data.precursors.location.join(', ') : String(data.precursors.location));
      }
      if (data.precursors?.activity) {
        setActivity(Array.isArray(data.precursors.activity) ? data.precursors.activity.join(', ') : String(data.precursors.activity));
      }

      setAnalysisState('completed');
      showToast(`Analysis Complete: ${data.risk_level} SIF Risk Score (${data.risk_score}%)`);
    } catch (err) {
      clearInterval(interval);
      setAnalysisState('error');
      setAnalysisError(err.message);
      showToast(`ML Analysis Failed: ${err.message}`);
    }
  };

  // Run live analysis on initial mount using the default scenario
  useEffect(() => {
    handleAnalyze(presets[0].text);
  }, []);

  const handleSelectPreset = (index) => {
    const p = presets[index];
    setSelectedPresetIndex(index);
    setTranscriptInput(p.text);
    setFacility(p.facility);
    setActivity(p.activity);
    setPressure(p.pressure);
    setGasLevel(p.gas);
    setTemperature(p.temp);
    setShift(p.shift);
    showToast(`Loaded: ${p.title}`);
    handleAnalyze(p.text);
  };

  const isSif = sifPotential;
  const topRule = lifeSavingRules[0];

  const getBorderColor = () => {
    switch (riskLevel) {
      case 'CRITICAL': return 'border-l-red-600';
      case 'HIGH': return 'border-l-orange-500';
      case 'MEDIUM': return 'border-l-amber-500';
      default: return 'border-l-emerald-500';
    }
  };

  const getBgGradient = () => {
    switch (riskLevel) {
      case 'CRITICAL': return 'bg-gradient-to-br from-white to-red-50/25';
      case 'HIGH': return 'bg-gradient-to-br from-white to-orange-50/25';
      case 'MEDIUM': return 'bg-gradient-to-br from-white to-amber-50/25';
      default: return 'bg-gradient-to-br from-white to-emerald-50/25';
    }
  };

  const getGaugeColor = () => {
    switch (riskLevel) {
      case 'CRITICAL': return '#DC2626';
      case 'HIGH': return '#EA580C';
      case 'MEDIUM': return '#D97706';
      default: return '#16A34A';
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* SECTION 1: HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-[#0F1E36] text-blue-200 rounded tracking-wide">
              SIF-GUARD v1.0
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">psychology</span>
              Baseline Hybrid NLP Classifier • Local FAISS RAG • Sentence Transformers (all-MiniLM-L6-v2)
            </span>
          </div>
          <h1 className="font-['Public_Sans'] font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            AI Safety Report Diagnostic & SIF Precursor Studio
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Submit raw field observations, inspection transcripts, or near-miss narratives. Evaluated by our leakage-free Baseline Hybrid NLP Classifier with reference IOGP / safety guideline RAG evidence retrieval and grounded GenAI explanation.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reports')}
            className="h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base text-slate-500">assignment</span>
            <span>View Incident Registry</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: WORKFLOW DUAL-PANEL LAYOUT (LEFT: INPUT & TELEMETRY, RIGHT: AI INTELLIGENCE & REASONING) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: INCIDENT INPUT & OPERATIONAL CONDITIONS (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="cad-card p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700 text-xl">edit_document</span>
                <h2 className="font-['Public_Sans'] font-bold text-base text-slate-900">
                  Incident Narrative & Observation Ingest
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">RAW VERBATIM</span>
            </div>

            {/* Presets Bar */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                Load Standard Investigation Scenario:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {presets.map((p, idx) => (
                  <button
                    key={p.title}
                    onClick={() => handleSelectPreset(idx)}
                    type="button"
                    className={`px-3.5 py-2.5 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer flex items-center justify-between ${
                      selectedPresetIndex === idx
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-sm ring-1 ring-blue-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{p.title}</span>
                    <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Verbatim Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Field Observation Transcript</span>
                <span className="font-mono text-[11px] text-slate-400">{transcriptInput.length} characters</span>
              </label>
              <textarea
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                rows={5}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 transition-all font-['Inter'] leading-relaxed"
                placeholder="Paste or type raw incident observation transcript..."
              />
            </div>

            {/* Operational Telemetry Inputs */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Target Asset Facility</div>
                  <div className="font-semibold text-slate-900 mt-1 truncate">{facility}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Operational Activity</div>
                  <div className="font-semibold text-slate-900 mt-1 truncate">{activity}</div>
                </div>
              </div>

              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block pt-1">
                Concurrent Field Telemetry Conditions:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Line Pressure</div>
                  <div className="font-mono font-bold text-slate-900 mt-1">{pressure}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">H2S Atmosphere</div>
                  <div className="font-mono font-bold text-slate-900 mt-1">{gasLevel}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Ambient Temp</div>
                  <div className="font-mono font-bold text-slate-900 mt-1">{temperature}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Operational Shift</div>
                  <div className="font-mono font-bold text-slate-900 mt-1">{shift}</div>
                </div>
              </div>
            </div>

            {/* Trigger Button with Loading State Indicator */}
            <button
              onClick={() => handleAnalyze()}
              disabled={analysisState === 'analyzing'}
              className="w-full h-12 bg-[#0F1E36] hover:bg-[#162B4D] disabled:bg-slate-700 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-3 shadow-md transition-all cursor-pointer active:scale-98"
              type="button"
            >
              {analysisState === 'analyzing' ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Analyzing Report...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl text-blue-300">smart_toy</span>
                  <span>Analyze with Safety AI Engine</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: AI INTELLIGENCE, CONFIDENCE GAUGE & RESULTS (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Active Loading Banner */}
          {analysisState === 'analyzing' && (
            <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg flex items-center gap-3 text-blue-900 shadow-sm animate-pulse">
              <span className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin flex-shrink-0"></span>
              <div className="text-xs">
                <span className="font-bold">Analyzing Report...</span>
                <span className="text-blue-700 block mt-0.5">
                  Sending request to ML API pipeline (/api/analyze)
                </span>
              </div>
            </div>
          )}

          {/* Connection Error Banner */}
          {analysisState === 'error' && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg flex items-start gap-3 text-red-900 text-xs shadow-sm">
              <span className="material-symbols-outlined text-red-600 text-lg flex-shrink-0">error</span>
              <div className="space-y-1">
                <div className="font-bold">ML API Request Failed</div>
                <p className="text-red-700">{analysisError}</p>
                <p className="text-red-600 text-[11px]">
                  Ensure the Flask ML API is running via <code className="bg-red-100 font-mono px-1 py-0.5 rounded">python server.py</code> on port 5000.
                </p>
                <button
                  onClick={() => handleAnalyze()}
                  className="mt-2 px-3 py-1 bg-red-700 text-white rounded text-[11px] font-semibold hover:bg-red-800 transition-colors"
                  type="button"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}

          {/* AI Verdict Card */}
          <div className={`cad-card p-6 sm:p-7 border-l-4 ${getBorderColor()} ${getBgGradient()} space-y-6`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSif ? 'bg-red-400' : 'bg-emerald-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isSif ? 'bg-red-600' : 'bg-emerald-600'}`}></span>
                </span>
                <span className={`font-mono text-xs font-bold ${isSif ? 'text-red-700' : 'text-emerald-700'} uppercase tracking-wide`}>
                  {isSif ? 'AI SIF DIAGNOSTIC VERDICT' : 'NON-SIF OBSERVATION VERDICT'}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-500 font-semibold uppercase">
                {analysisResult?.model?.name || 'Baseline Hybrid NLP Classifier'} ({analysisResult?.model?.version || 'sif-baseline-v1'})
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* SIF Score & Badge */}
              <div className="space-y-2 text-center sm:text-left">
                {isSif ? (
                  <div className="inline-block px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 font-mono text-xs font-bold rounded">
                    ⚠️ {riskLevel} SIF POTENTIAL DETECTED
                  </div>
                ) : (
                  <div className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold rounded">
                    ✅ NON-SIF OBSERVATION: {riskLevel} RISK
                  </div>
                )}
                <div className="font-['Public_Sans'] font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                  {riskScore.toFixed(1)}% SIF Risk Score
                </div>
                <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                  {isSif
                    ? 'Evaluated as potential Serious Injury or Fatality precursor requiring formal intervention.'
                    : 'Classified as low-energy routine observation. Standard preventative logging applies.'}
                </p>
                <div className="text-[10px] font-mono text-slate-500">
                  KB: {analysisResult?.model?.knowledge_base_version || 'kb-v1'} • Embed: {analysisResult?.model?.embedding_model || 'all-MiniLM-L6-v2'}
                </div>
              </div>

              {/* Confidence Ring Gauge */}
              <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#E2E8F0" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={getGaugeColor()}
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - Math.min(Math.max(riskScore, 0), 100) / 100)}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-xl font-black text-slate-900 leading-none">{Math.round(riskScore)}%</span>
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-tight">SIF Risk</span>
                </div>
              </div>
            </div>

            {/* Prescribed Action Banner */}
            <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs">
              <span className="material-symbols-outlined text-blue-700 text-lg flex-shrink-0 mt-0.5">notification_important</span>
              <div className="space-y-1">
                <div>
                  <span className="font-bold text-blue-950">Recommended Action: </span>
                  <span className="text-blue-900 font-medium">{action || 'Log and monitor. Routine follow-up.'}</span>
                </div>
                <div className="text-[10px] text-blue-700/80 font-mono italic">
                  AI-generated decision support — HSE review required.
                </div>
              </div>
            </div>

            {/* Attributed Life-Saving Rule */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-red-600 text-lg">shield_locked</span>
                  <div>
                    <span className="font-bold text-slate-900">Applicable Life-Saving Rule: </span>
                    <span className="text-slate-800 font-semibold">{analysisResult?.lsr?.rule || topRule?.rule || 'General Safety Observation'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                    Match Strength: <strong>{analysisResult?.lsr?.match_strength || 'HIGH'}</strong>
                  </span>
                  <span className="font-mono text-[11px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    Rule Match Score: {analysisResult?.lsr?.score !== undefined ? `${(analysisResult.lsr.score).toFixed(2)} (${Math.round(analysisResult.lsr.score * 100)}%)` : '0.95 (95%)'}
                  </span>
                </div>
              </div>
              {topRule?.intervention && (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Mandatory Intervention: </span>
                  {topRule.intervention}
                </div>
              )}
              {topRule?.matched_kws?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 pt-0.5">
                  <span className="font-medium text-slate-600">Matched Signal Keywords:</span>
                  {topRule.matched_kws.map((kw, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] border border-slate-200">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* AI Explanation Section */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold uppercase tracking-wide text-[11px]">
                <span className="material-symbols-outlined text-amber-700 text-base">psychology</span>
                <span>Why Was This Flagged? (Grounded AI Explanation)</span>
              </div>
              <p className="text-amber-950 font-['Inter'] leading-relaxed">
                {aiExplanation || 'Explanation unavailable.'}
              </p>
            </div>

            {/* Extracted Precursors & Risk Factors */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wide text-[11px]">
                <span className="material-symbols-outlined text-slate-600 text-base">fact_check</span>
                <span>AI-Extracted Risk Factors</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">Activity: </span>
                  <span>{Array.isArray(analysisResult?.precursors?.activity) ? analysisResult.precursors.activity.join(', ') : (analysisResult?.precursors?.activity || 'Sludge removal')}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Location: </span>
                  <span>{Array.isArray(analysisResult?.precursors?.location) ? analysisResult.precursors.location.join(', ') : (analysisResult?.precursors?.location || 'Facility Grounds')}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Equipment: </span>
                  <span>{Array.isArray(analysisResult?.precursors?.equipment) ? analysisResult.precursors.equipment.join(', ') : (analysisResult?.precursors?.equipment || 'Separator Vessel, Manhole')}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Hazards: </span>
                  <span>{Array.isArray(analysisResult?.precursors?.hazards) ? analysisResult.precursors.hazards.join(', ') : (analysisResult?.precursors?.hazards || 'H2S exposure, Oxygen deficiency')}</span>
                </div>
              </div>

              {analysisResult?.precursors?.potential_consequences?.length > 0 && (
                <div className="pt-1 text-[11px]">
                  <span className="font-semibold text-slate-900">Potential Consequences: </span>
                  <span className="text-red-700 font-medium">
                    {analysisResult.precursors.potential_consequences.join(' • ')}
                  </span>
                </div>
              )}

              <div className="space-y-1 pt-1">
                <span className="font-semibold text-slate-900">Barrier Failures Identified:</span>
                {barrierFailures.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {barrierFailures.map((bf, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded text-[11px] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-red-600">cancel</span>
                        {bf}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    <span>No explicit barrier failure identified</span>
                  </div>
                )}
              </div>
            </div>

            {/* Authoritative Safety Evidence (RAG Retrieval) */}
            <div className="p-3.5 bg-slate-900 text-white rounded-lg space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[11px] text-blue-300">
                  <span className="material-symbols-outlined text-blue-400 text-base">menu_book</span>
                  <span>Authoritative Safety Evidence (RAG Retrieval)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  {analysisResult?.evidence?.length || 0} Chunks Indexed
                </span>
              </div>
              <div className="space-y-2">
                {analysisResult?.evidence && analysisResult.evidence.length > 0 ? (
                  analysisResult.evidence.map((ev, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-800/80 rounded border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-amber-300">{ev.source}</span>
                        <span className="font-mono text-[10px] text-slate-400">Relevance: {Math.round((ev.score || 0.8) * 100)}%</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-300 font-semibold">{ev.section}</div>
                      <p className="text-[11px] text-slate-300 leading-snug line-clamp-3 italic">
                        "{ev.text}"
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-[11px] italic">
                    Authoritative safety evidence unavailable in the current prototype knowledge base.
                  </p>
                )}
              </div>
            </div>

            {/* Similar Precursor Patterns (Sentence Transformers) */}
            {analysisResult?.similar_patterns?.length > 0 && (
              <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wide text-[11px]">
                  <span className="material-symbols-outlined text-blue-600 text-base">hub</span>
                  <span>Similar Precursor Patterns (Semantic Embeddings)</span>
                </div>
                <div className="space-y-1.5">
                  {analysisResult.similar_patterns.map((sim, i) => (
                    <div key={i} className="p-2 bg-slate-50 border border-slate-100 rounded text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800">{sim.report_id} ({sim.location})</span>
                        <span className="font-mono text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {Math.round(sim.similarity_score * 100)}% Match
                        </span>
                      </div>
                      <p className="text-slate-600 truncate">{sim.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Explainable AI Pipeline */}
          <div className="cad-card p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900">
                  Explainable AI Pipeline
                </h3>
                <p className="text-xs text-slate-500">Six-stage analysis workflow</p>
              </div>
              <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded font-bold">
                {currentStepIndex} / 6 STEPS
              </span>
            </div>

            <div className="space-y-3">
              {reasoningSteps.map((step, idx) => {
                const isDone = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx && analysisState === 'analyzing';

                return (
                  <div
                    key={step.num}
                    className={`p-3.5 rounded-lg border transition-all flex items-start gap-3.5 ${
                      isDone
                        ? 'bg-white border-slate-200 shadow-sm'
                        : isCurrent
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 animate-step-evaluating'
                        : 'bg-slate-50/60 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5 ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-blue-700 text-white animate-spin'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isDone ? (
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      ) : isCurrent ? (
                        <span className="material-symbols-outlined text-sm font-bold">sync</span>
                      ) : (
                        step.num
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900">{step.title}</span>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{step.key}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: DEEP BOW-TIE BARRIER DEFENSE & SCENARIO-BASED SAFETY ASSESSMENT (FULL WIDTH BELOW) */}
      <section className="space-y-6">
        <div className="border-t border-slate-200 pt-8">
          <h2 className="font-['Public_Sans'] font-bold text-xl text-slate-900">
            Bow-Tie Barrier Degradation & Systemic Restoration
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Dynamic analysis of preventative defenses, mitigative safeguards, and scenario-based safety assessment based on ML precursor extraction.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Preventative & Mitigative Barrier Status */}
          <div className="cad-card p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900">
                Bow-Tie Safety Defense Matrix
              </h3>
              <span className="text-xs font-mono text-slate-500">
                {barrierFailures.length > 0 ? `${barrierFailures.length} Barrier Breaches Identified` : 'Controls Operational'}
              </span>
            </div>

            <div className="space-y-3">
              {/* Dynamically list identified barrier failures */}
              {barrierFailures.map((bf, idx) => (
                <div key={idx} className="p-3.5 bg-red-50/60 border border-red-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{bf}</span>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border bg-red-100 text-red-700 border-red-300">
                      BREACHED
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Identified non-compliance in safety narrative</span>
                    <span className="font-mono text-red-600 font-semibold">Primary Precursor</span>
                  </div>
                </div>
              ))}

              {/* Standard preventative & mitigative barriers */}
              {[
                {
                  name: topRule?.rule ? `${topRule.rule} Verification` : 'Permit-to-Work & Hazard Assessment',
                  type: 'Preventative',
                  status: isSif ? 'DEGRADED' : 'INTACT',
                  statusColor: isSif ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300',
                  desc: isSif ? 'Operational compliance degraded during task execution' : 'Standard controls verified intact'
                },
                {
                  name: 'Personal Protective Equipment (PPE) & Atmospheric Monitor',
                  type: 'Mitigative',
                  status: 'INTACT',
                  statusColor: 'bg-emerald-100 text-emerald-700 border-emerald-300',
                  desc: 'Technicians utilizing mandatory safety gear'
                },
                {
                  name: 'Emergency Response & Stop Work Authority (SWA)',
                  type: 'Mitigative',
                  status: 'AVAILABLE',
                  statusColor: 'bg-blue-100 text-blue-700 border-blue-300',
                  desc: 'Personnel empowered to halt unsafe activities immediately'
                }
              ].map((b) => (
                <div key={b.name} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{b.name}</span>
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${b.statusColor}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{b.desc}</span>
                    <span className="font-mono text-slate-400">{b.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario-Based Safety Assessment "What Could Have Happened?" */}
          <div className="cad-card p-6 sm:p-7 space-y-5 bg-gradient-to-br from-white to-slate-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900">
                Scenario-Based Safety Assessment: "What Could Have Happened?"
              </h3>
              <span className="font-mono text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded font-bold">
                {isSif ? 'HIGH-CONSEQUENCE TRAJECTORY' : 'LOW-CONSEQUENCE TRAJECTORY'}
              </span>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-700">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <div className="font-bold text-red-900 text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-red-600 text-base">emergency_home</span>
                  <span>Plausible Maximum Consequence (PMC): {isSif ? 'Potential Fatality or Life-Altering Injury' : 'Minor First-Aid Event'}</span>
                </div>
                <p className="text-red-950">
                  {aiExplanation || 'Without active barrier enforcement, high-energy exposure vectors create unacceptable risk of severe personnel injury or catastrophic equipment loss.'}
                </p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-600 text-base">verified_user</span>
                  <span>Mandated Corrective Mitigations:</span>
                </div>
                <ul className="space-y-1.5 text-emerald-950 list-disc list-inside">
                  <li>{action || 'Escalate to site supervisor within 24 hours.'}</li>
                  {topRule?.intervention && <li>{topRule.intervention}</li>}
                  <li>Audit verification checklist for active facility permit.</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/reports/PROTO-10231')}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                  type="button"
                >
                  <span>Open Prototype SIF Investigation</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
