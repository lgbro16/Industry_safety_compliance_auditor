import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getApiUrl } from '../config/api';

export default function ReviewQueuePage() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [queueItems, setQueueItems] = useState([
    {
      id: 'PROTO-10231',
      facility: 'Duliajan Rig #4',
      title: 'Energy Isolation Failure During Pump P-302 Maintenance',
      aiSeverity: 'AI-Flagged SIF Precursor (Risk Score: 0.94)',
      barrier: 'Energy Isolation / LOTO',
      matchStrength: 'High Match (0.94)',
      matchColor: 'bg-emerald-100 text-emerald-800',
      status: 'PENDING'
    },
    {
      id: 'PROTO-10228',
      facility: 'Moran Tank Farm',
      title: 'Atmospheric H2S Sensor Drift in Crude Tank Diked Zone',
      aiSeverity: 'AI-Flagged SIF Precursor (Risk Score: 0.88)',
      barrier: 'Gas Detection / Ventilation',
      matchStrength: 'High Match (0.91)',
      matchColor: 'bg-emerald-100 text-emerald-800',
      status: 'PENDING'
    },
    {
      id: 'PROTO-10219',
      facility: 'Digboi Feeder Line 9',
      title: 'Crane Hoist Wire-Rope Strand Disruption in SIMOPS Corridor',
      aiSeverity: 'AI-Flagged SIF Precursor (Risk Score: 0.81)',
      barrier: 'Mechanical Integrity',
      matchStrength: 'Moderate Match (0.78)',
      matchColor: 'bg-amber-100 text-amber-800',
      status: 'PENDING'
    },
    {
      id: 'PROTO-10204',
      facility: 'Nahorkatiya Station',
      title: 'ESD Emergency Shutdown Valve Air Solenoid Slow Stroke Time',
      aiSeverity: 'AI-Flagged SIF Precursor (Risk Score: 0.78)',
      barrier: 'Emergency Shutdown (ESD)',
      matchStrength: 'Moderate Match (0.74)',
      matchColor: 'bg-amber-100 text-amber-800',
      status: 'PENDING'
    },
    {
      id: 'PROTO-10190',
      facility: 'Duliajan Rig #4',
      title: 'Rotary Bushing Safety Lock Pin Misaligned during Tripping Pipe',
      aiSeverity: 'AI-Flagged SIF Precursor (Risk Score: 0.84)',
      barrier: 'Line of Fire / Machine Guarding',
      matchStrength: 'High Match (0.92)',
      matchColor: 'bg-emerald-100 text-emerald-800',
      status: 'PENDING'
    },
  ]);

  const [filterMatch, setFilterMatch] = useState('ALL');

  // Load existing reviews on mount to restore audit state
  useEffect(() => {
    fetch(getApiUrl('/api/reviews'))
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.reviews && data.reviews.length > 0) {
          const reviewedMap = {};
          data.reviews.forEach(r => {
            reviewedMap[r.report_id] = r.action;
          });
          setQueueItems(prev => prev.map(item => {
            if (reviewedMap[item.id]) {
              const act = reviewedMap[item.id];
              return {
                ...item,
                status: act === 'CONFIRM' ? 'CONFIRMED' : act === 'OVERRIDE' ? 'MODIFIED' : 'ESCALATED',
                aiSeverity: act === 'CONFIRM' ? 'HSE-Confirmed SIF Precursor' : item.aiSeverity
              };
            }
            return item;
          }));
        }
      })
      .catch(() => {
        // Prototype mode: local state fallback
      });
  }, []);

  const handleApprove = async (id) => {
    setQueueItems(queueItems.map(item =>
      item.id === id
        ? { ...item, status: 'CONFIRMED', aiSeverity: 'HSE-Confirmed SIF Precursor' }
        : item
    ));
    showToast(`HSE Confirmed: ${id} verified as HSE-Confirmed SIF Precursor`);

    try {
      await fetch(getApiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: id,
          action: 'CONFIRM',
          reviewer: 'Lead HSE Reviewer',
          notes: 'HSE verified Life-Saving Rule precursor breach',
          adjusted_sif: true
        })
      });
    } catch {
      // Local state fallback preserved
    }
  };

  const handleOverride = async (id) => {
    setQueueItems(queueItems.map(item =>
      item.id === id
        ? { ...item, status: 'MODIFIED', aiSeverity: 'Standard Safety Observation (Non-SIF)' }
        : item
    ));
    showToast(`HSE Override: ${id} downgraded to standard observation`);

    try {
      await fetch(getApiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: id,
          action: 'OVERRIDE',
          reviewer: 'Lead HSE Reviewer',
          notes: 'Downgraded after field verification; no catastrophic potential',
          adjusted_sif: false
        })
      });
    } catch {
      // Local state fallback preserved
    }
  };

  const handleEscalate = async (id) => {
    setQueueItems(queueItems.map(item =>
      item.id === id ? { ...item, status: 'ESCALATED' } : item
    ));
    showToast(`Escalated ${id} to Corporate HSE SIF Committee`);

    try {
      await fetch(getApiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: id,
          action: 'ESCALATE',
          reviewer: 'Lead HSE Reviewer',
          notes: 'Escalated to Corporate HSE SIF Committee for multi-discipline review',
          adjusted_sif: null
        })
      });
    } catch {
      // Local state fallback preserved
    }
  };

  const pendingCount = queueItems.filter(i => i.status === 'PENDING').length;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-amber-500 text-slate-950 rounded tracking-wide">
              HUMAN-IN-THE-LOOP
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">rate_review</span>
              Safety AI Feedback & Triage Queue
            </span>
          </div>
          <h1 className="font-['Public_Sans'] font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Human-in-the-Loop Review Queue & Feedback
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Lead Safety Officers verify, calibrate, or overrule AI-flagged SIF precursor predictions. Confirmed reviews are stored in the audit trail to build verified HSE-labeled ground truth for model governance.
          </p>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center gap-4 text-xs">
          <div>
            <div className="text-slate-400 uppercase font-mono text-[10px]">Active Review Backlog</div>
            <div className="font-['Public_Sans'] text-xl font-bold text-slate-900">{pendingCount} Items Pending</div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
        </div>
      </div>

      {/* MATCH STRENGTH STRATIFICATION TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div
          onClick={() => {
            const next = filterMatch === 'HIGH' ? 'ALL' : 'HIGH';
            setFilterMatch(next);
            showToast(`Filter: ${next} match strength`);
          }}
          className={`cad-card-interactive p-5 border-l-4 border-l-emerald-600 space-y-2 cursor-pointer ${filterMatch === 'HIGH' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">High Risk Score (&gt;0.80)</span>
            <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
          </div>
          <div className="font-['Public_Sans'] text-2xl font-extrabold text-slate-900">3 Items</div>
          <p className="text-xs text-slate-500">Unambiguous Life-Saving Rule breach indicators.</p>
        </div>

        <div
          onClick={() => {
            const next = filterMatch === 'MODERATE' ? 'ALL' : 'MODERATE';
            setFilterMatch(next);
            showToast(`Filter: ${next} match strength`);
          }}
          className={`cad-card-interactive p-5 border-l-4 border-l-amber-500 space-y-2 cursor-pointer ${filterMatch === 'MODERATE' ? 'ring-2 ring-amber-500 bg-amber-50/20' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Moderate Risk Score (0.50 - 0.80)</span>
            <span className="material-symbols-outlined text-amber-600 text-lg">help_outline</span>
          </div>
          <div className="font-['Public_Sans'] text-2xl font-extrabold text-slate-900">2 Items</div>
          <p className="text-xs text-slate-500">Secondary barrier impairment requiring field verification.</p>
        </div>

        <div
          onClick={() => {
            const next = filterMatch === 'AMBIGUOUS' ? 'ALL' : 'AMBIGUOUS';
            setFilterMatch(next);
            showToast(`Filter: ${next} match strength`);
          }}
          className={`cad-card-interactive p-5 border-l-4 border-l-red-600 space-y-2 cursor-pointer ${filterMatch === 'AMBIGUOUS' ? 'ring-2 ring-red-500 bg-red-50/20' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Near Boundary / Low Evidence</span>
            <span className="material-symbols-outlined text-red-600 text-lg">error</span>
          </div>
          <div className="font-['Public_Sans'] text-2xl font-extrabold text-slate-900">0 Items</div>
          <p className="text-xs text-slate-500">Human committee adjudication required.</p>
        </div>
      </div>

      {/* ACTIVE REVIEW QUEUE TABLE */}
      <section className="cad-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-['Public_Sans'] font-bold text-lg text-slate-900">
              Active Human Review Items
            </h2>
            <p className="text-xs text-slate-500">Select an action to sign off or adjust AI risk classifications</p>
          </div>
          <span className="font-mono text-xs text-slate-500">FIFO QUEUE PRIORITY</span>
        </div>

        <div className="space-y-4">
          {queueItems.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                item.status === 'CONFIRMED'
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : item.status === 'ESCALATED'
                  ? 'bg-purple-50/50 border-purple-200 opacity-80'
                  : item.status === 'MODIFIED'
                  ? 'bg-blue-50/50 border-blue-200 opacity-80'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="space-y-2 min-w-0 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-blue-700 text-xs">{item.id}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-medium text-slate-500">{item.facility}</span>
                  <span className="text-slate-300">•</span>
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${item.matchColor}`}>
                    MATCH STRENGTH: {item.matchStrength}
                  </span>
                </div>

                <h3
                  onClick={() => navigate(`/reports/${item.id}`)}
                  className="font-['Public_Sans'] font-bold text-sm sm:text-base text-slate-900 hover:text-blue-700 cursor-pointer transition-colors leading-snug"
                >
                  {item.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <span>Classification: <strong className={item.status === 'CONFIRMED' ? 'text-emerald-700 font-bold' : 'text-red-600'}>{item.aiSeverity}</strong></span>
                  <span>Compromised Barrier: <strong className="text-slate-800">{item.barrier}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {item.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">check</span>
                      <span>Confirm SIF Precursor</span>
                    </button>
                    <button
                      onClick={() => handleOverride(item.id)}
                      className="h-9 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base text-amber-600">edit</span>
                      <span>Downgrade / Override</span>
                    </button>
                    <button
                      onClick={() => handleEscalate(item.id)}
                      className="h-9 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base text-purple-600">publish</span>
                      <span>Escalate</span>
                    </button>
                  </>
                ) : (
                  <span className={`font-mono text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                    item.status === 'CONFIRMED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>STATUS: {item.status === 'CONFIRMED' ? 'HSE-CONFIRMED SIF' : item.status}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
