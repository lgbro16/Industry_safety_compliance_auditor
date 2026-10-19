import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getApiUrl } from '../config/api';

export default function ReportDetailPage() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [decision, setDecision] = useState('CONFIRM_SIF');
  const [reviewNotes, setReviewNotes] = useState(
    'Concur with safety intelligence assessment. Unbolting high-pressure crude piping without formal bleed-off verification represents a critical SIF precursor. Issuing Level 1 Stop Work until mechanical isolation protocol is verified across Rig #4 crews.'
  );
  const [isSignedOff, setIsSignedOff] = useState(false);

  // Corrective action items state
  const [actions, setActions] = useState([
    { id: 1, title: 'Re-certify and leak-test double-block-and-bleed valves on Pump P-302 manifold', owner: 'Mechanical Maintenance Team (R. Bora)', deadline: '15 Sep 2026', done: true },
    { id: 2, title: 'Implement digital barcode scan requirement at pressure bleed point before flange permit release', owner: 'Digital HSE Ops (S. Sen)', deadline: '18 Sep 2026', done: false },
    { id: 3, title: 'Conduct mandatory safety stand-down with Duliajan Rig #4 night shift crews', owner: 'Rig Superintendent (M. Hazarika)', deadline: '14 Sep 2026', done: false },
    { id: 4, title: 'Recalibrate local pressure gauge PG-102 and install high-visibility red-line limit marker', owner: 'Instrumentation Dept (P. Das)', deadline: '16 Sep 2026', done: true },
  ]);

  const toggleAction = (id) => {
    setActions(actions.map(a => a.id === id ? { ...a, done: !a.done } : a));
    showToast('Corrective barrier restoration updated');
  };

  const handleSignOff = async (e) => {
    e.preventDefault();
    setIsSignedOff(true);
    showToast('Report #PROTO-10231 HSE review recorded and logged to audit trail');
    try {
      await fetch(getApiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: 'PROTO-10231',
          action: decision === 'CONFIRM_SIF' ? 'CONFIRM' : decision === 'DOWNGRADE_NEAR_MISS' ? 'OVERRIDE' : 'ESCALATE',
          reviewer: 'Lead HSE Reviewer',
          notes: reviewNotes,
          adjusted_sif: decision === 'CONFIRM_SIF'
        })
      });
    } catch {
      // Prototype fallback
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* BREADCRUMBS & TOP NAV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-blue-700 hover:underline">Dashboard</Link>
          <span className="text-slate-300">/</span>
          <Link to="/reports" className="hover:text-blue-700 hover:underline">Safety Reports</Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-slate-900 font-bold">#PROTO-10231 (Demo)</span>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reports')}
            className="h-9 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back to Registry</span>
          </button>
          <button
            onClick={() => navigate('/export')}
            className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Export Investigation Dossier</span>
          </button>
        </div>
      </div>

      {/* INCIDENT HEADER CARD */}
      <div className="cad-card p-6 sm:p-8 border-l-4 border-l-red-600 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 rounded">
                CRITICAL SIF PRECURSOR
              </span>
              <span className="font-mono text-xs font-semibold text-slate-500">INCIDENT ID: #PROTO-10231 (Demonstration Case)</span>
              {isSignedOff && (
                <span className="font-mono text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  SIGNED OFF BY HSE REVIEWER
                </span>
              )}
            </div>
            <h1 className="font-['Public_Sans'] font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight mt-2">
              Energy Isolation Failure During High-Pressure Pump P-302 Maintenance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Duliajan Drilling Complex • Rig #4 Pump House • Night Shift Handover (13 Sep 2026, 02:45 IST)
            </p>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <div className="font-mono text-2xl font-extrabold text-red-600">0.94</div>
              <div className="text-[10px] font-mono text-red-800 uppercase font-bold tracking-tight">SIF Risk Score</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div className="font-mono text-2xl font-extrabold text-slate-900">42 bar</div>
              <div className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-tight">Line Pressure</div>
            </div>
          </div>
        </div>

        {/* Telemetry Operational Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-400 text-[11px] block">Atmospheric Gas Level</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">0.0 ppm H2S (Normal)</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-400 text-[11px] block">Ambient Meteorological</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">34°C • 14 kts Wind</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-400 text-[11px] block">Investigating HSE Officer</span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block">Lead HSE Officer (Rig #4)</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-slate-400 text-[11px] block">Permit to Work Reference</span>
            <span className="font-mono font-bold text-blue-700 text-sm mt-0.5 block">PTW-DUL-2026-881</span>
          </div>
        </div>
      </div>

      {/* SECTION: ORIGINAL VERBATIM & SEMANTIC ENTITY HIGHLIGHTING */}
      <div className="cad-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-['Public_Sans'] font-bold text-base text-slate-900">
              Verbatim Observation Transcript & Semantic Entity Extraction
            </h2>
            <p className="text-xs text-slate-500">Entities isolated by AI NLP parser for hazard energy classification</p>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-800 rounded font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-red-600"></span> Energy Source
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span> Barrier Breach
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Intercepting Action
            </span>
          </div>
        </div>

        <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg text-sm sm:text-base leading-relaxed text-slate-800 font-['Inter']">
          "During night shift maintenance on Pump P-302 at Duliajan Rig #4, mechanical technicians{' '}
          <span className="bg-amber-100 text-amber-900 border-b-2 border-amber-500 font-semibold px-1 py-0.5 rounded">
            unbolted the casing flange before completing the mechanical double-block-and-bleed isolation verification
          </span>
          . The electrical breaker was tagged out, but the{' '}
          <span className="bg-red-100 text-red-900 border-b-2 border-red-500 font-semibold px-1 py-0.5 rounded">
            upstream bypass valve remained partially cracked under 42 bar residual line pressure
          </span>
          . Catastrophic pressurized hydrocarbon fluid spray was averted when the{' '}
          <span className="bg-emerald-100 text-emerald-900 border-b-2 border-emerald-500 font-semibold px-1 py-0.5 rounded">
            lead operator noticed pressure gauge PG-102 reading 600 PSI
          </span>{' '}
          before final flange stud removal."
        </div>
      </div>

      {/* DUAL SECTION: BOW-TIE DEFENSE BREAKDOWN & SCENARIO-BASED SAFETY ASSESSMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bow-Tie Degradation Matrix */}
        <div className="cad-card p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900">
                Bow-Tie Safety Barrier Matrix
              </h3>
              <p className="text-xs text-slate-500">Preventative vs Mitigative Barrier Integrity</p>
            </div>
            <span className="text-xs font-mono text-slate-400">AUDIT LOG</span>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Mechanical Double Block & Bleed', state: 'FAILED', color: 'bg-red-100 text-red-700 border-red-300', note: 'Upstream manual bypass cracked 15% open' },
              { name: 'Electrical Lockout / Tagout (LOTO)', state: 'INTACT', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', note: 'Motor switchboard breaker locked with safety pad' },
              { name: 'Pressure Gauge Zero Verification', state: 'DEGRADED', color: 'bg-amber-100 text-amber-700 border-amber-300', note: 'Late verification at final stud stage' },
              { name: 'Flange Deflector Splash Guard', state: 'MISSING', color: 'bg-red-100 text-red-700 border-red-300', note: 'No spray containment shroud attached' },
              { name: 'PPE Shield & Eye Protection', state: 'INTACT', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', note: 'Both technicians wore full face shields' },
            ].map((b) => (
              <div key={b.name} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-slate-900">{b.name}</div>
                  <div className="text-slate-500 mt-0.5">{b.note}</div>
                </div>
                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${b.color} flex-shrink-0`}>
                  {b.state}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scenario-Based Safety Assessment */}
        <div className="cad-card p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900">
                Scenario-Based Safety Assessment: "What Could Have Happened?"
              </h3>
              <p className="text-xs text-slate-500">Plausible High-Consequence Exposure Trajectory</p>
            </div>
            <span className="font-mono text-xs text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded">
              SIF IMPACT: FATAL
            </span>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-slate-700">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-bold text-slate-900 block text-sm">Actual Realized Outcome:</span>
              <p className="text-slate-600">
                Near miss. Zero injuries. Line depressurized to 0 bar after bypass valve closed and bleed needle verified.
              </p>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-1.5">
              <span className="font-bold text-red-900 block text-sm">Unconstrained Failure Envelope:</span>
              <p className="text-red-950">
                Removing the final stud bolt under 42 bar (600 PSI) would have ejected pressurized crude oil directly into the technician's torso at point-blank range, inflicting fatal blunt trauma and igniting on hot motor manifolds.
              </p>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-medium">
              Classified as SIF Precursor Priority 1 under Prototype HSE Analysis (OISD-105 reference).
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: HUMAN SAFETY OFFICER EVALUATION & SIGN-OFF */}
      <div className="cad-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-['Public_Sans'] font-bold text-base text-slate-900">
              Human HSE Lead Evaluation & Sign-off
            </h2>
            <p className="text-xs text-slate-500">Human-in-the-Loop review under Prototype HSE Analysis</p>
          </div>
          <span className="text-xs font-mono text-slate-400">HSE REVIEW STAMP (PROTOTYPE)</span>
        </div>

        <form onSubmit={handleSignOff} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Formal Adjudication Classification
              </label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                disabled={isSignedOff}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-blue-700 cursor-pointer"
              >
                <option value="CONFIRM_SIF">Confirm SIF Precursor (Action Plan Required Within 24h)</option>
                <option value="DOWNGRADE_NEAR_MISS">Downgrade to Standard Near Miss (No SIF Potential)</option>
                <option value="ESCALATE_COMMITTEE">Escalate to Corporate HSE SIF Committee</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                HSE Review Role (Prototype)
              </label>
              <div className="h-11 px-3 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-slate-500">badge</span>
                  <span>Lead HSE Reviewer (Role ID: HSE-REV-04)</span>
                </span>
                <span className="font-mono text-blue-700 font-bold">ASSIGNED</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
              Lead Officer Diagnostic Findings & Action Orders
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              disabled={isSignedOff}
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-700 font-['Inter'] leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Prototype audit record ID: <code className="font-mono text-slate-700">PROTO-REV-10231-01</code>
            </div>

            <button
              type="submit"
              disabled={isSignedOff}
              className={`h-11 px-6 font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                isSignedOff
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-[#0F1E36] hover:bg-[#162B4D] text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isSignedOff ? 'check_circle' : 'verified'}
              </span>
              <span>{isSignedOff ? 'HSE Sign-off Recorded (Prototype)' : 'Submit Review Sign-off'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION: PRESCRIBED CORRECTIVE BARRIER RESTORATIONS */}
      <div className="cad-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-['Public_Sans'] font-bold text-base text-slate-900">
              Prescribed Corrective Barrier Restorations
            </h2>
            <p className="text-xs text-slate-500">Recommended action items to restore barrier integrity</p>
          </div>
          <span className="font-mono text-xs text-slate-500">
            {actions.filter(a => a.done).length} of {actions.length} Completed
          </span>
        </div>

        <div className="space-y-3">
          {actions.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleAction(item.id)}
              className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                item.done
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-blue-700 focus:ring-blue-600 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className={`text-xs sm:text-sm font-semibold truncate ${item.done ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Assigned: {item.owner}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0 font-mono text-xs">
                <div className={item.done ? 'text-emerald-700 font-bold' : 'text-orange-700 font-bold'}>
                  {item.done ? 'COMPLETED' : `DUE ${item.deadline}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
