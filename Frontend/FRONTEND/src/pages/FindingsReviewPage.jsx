import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';
import { useApp } from '../context/AppContext';

export default function FindingsReviewPage() {
  const { showToast } = useApp();
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Review Form
  const [reviewerName, setReviewerName] = useState('Lead HSE Safety Officer');
  const [decision, setDecision] = useState('CONFIRM');
  const [comments, setComments] = useState('');
  const [actionItem, setActionItem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadFindings = async () => {
    try {
      setLoading(true);
      let url = '/api/findings';
      const params = [];
      if (statusFilter !== 'ALL') params.push(`status=${statusFilter}`);
      if (severityFilter !== 'ALL') params.push(`severity=${severityFilter}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(getApiUrl(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setFindings(json.findings || []);
    } catch (err) {
      console.error('Failed to load findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, [statusFilter, severityFilter]);

  const handleOpenReview = (finding, defaultDecision = 'CONFIRM') => {
    setSelectedFinding(finding);
    setDecision(defaultDecision);
    setComments(
      defaultDecision === 'CONFIRM' ? 'Verified on-site physical conditions. Discrepancy matches statutory violation criteria.' :
      defaultDecision === 'OVERRIDE' ? 'Operational controls provide alternative approved risk mitigation.' :
      'High systemic risk requires escalation to Asset General Manager.'
    );
    setActionItem(finding.recommended_action || '');
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFinding) return;

    try {
      setSubmitting(true);
      const res = await fetch(getApiUrl(`/api/findings/${selectedFinding.id}/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decision,
          reviewer_name: reviewerName,
          comments: comments,
          action_item: actionItem
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(`Finding ${selectedFinding.id} adjudicated as ${decision}.`);
      setReviewModalOpen(false);
      setSelectedFinding(null);
      loadFindings();
    } catch (err) {
      console.error('Review error:', err);
      showToast('Failed to record review adjudication.');
    } finally {
      setSubmitting(false);
    }
  };

  const counts = {
    total: findings.length,
    candidate: findings.filter((f) => f.status === 'CANDIDATE').length,
    confirmed: findings.filter((f) => f.status === 'CONFIRMED').length,
    overridden: findings.filter((f) => f.status === 'OVERRIDDEN').length,
    escalated: findings.filter((f) => f.status === 'ESCALATED').length,
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">
            HUMAN-IN-THE-LOOP ADJUDICATION
          </span>
          <span className="text-slate-400 text-xs">•</span>
          <span className="text-xs text-slate-500 font-mono">Formal Governance Gate</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold font-['Public_Sans'] text-slate-900 tracking-tight">
          Findings Adjudication & Compliance Review Queue
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Review evidence-backed candidate findings synthesized across internal telemetry and TinyFish external research. Strict governance rule: AI candidate findings are never represented as confirmed statutory violations until validated by an authorized HSE officer.
        </p>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 block">Awaiting Review</span>
          <span className="text-2xl font-extrabold text-amber-600 font-['Public_Sans'] mt-1 block">
            {counts.candidate}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-red-200 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-red-700 block">Confirmed Violations</span>
          <span className="text-2xl font-extrabold text-red-600 font-['Public_Sans'] mt-1 block">
            {counts.confirmed}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-purple-200 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-purple-700 block">Escalated</span>
          <span className="text-2xl font-extrabold text-purple-700 font-['Public_Sans'] mt-1 block">
            {counts.escalated}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Overridden / False +</span>
          <span className="text-2xl font-extrabold text-slate-700 font-['Public_Sans'] mt-1 block">
            {counts.overridden}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'CANDIDATE', 'CONFIRMED', 'ESCALATED', 'OVERRIDDEN'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex-shrink-0 ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Findings' :
               st === 'CANDIDATE' ? 'Unreviewed (Candidate)' :
               st === 'CONFIRMED' ? 'Confirmed' :
               st === 'ESCALATED' ? 'Escalated' : 'Overridden'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Findings Cards List */}
      <div className="space-y-4">
        {findings.length > 0 ? (
          findings.map((finding) => (
            <div key={finding.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              {/* Finding Status Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                    finding.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                    finding.severity === 'HIGH' ? 'bg-amber-600 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {finding.severity}
                  </span>

                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                    finding.status === 'CANDIDATE' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                    finding.status === 'CONFIRMED' ? 'bg-red-50 text-red-800 border-red-300' :
                    finding.status === 'ESCALATED' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                    'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {finding.status === 'CANDIDATE' ? 'UNREVIEWED CANDIDATE' : finding.status}
                  </span>

                  <span className="text-xs font-mono text-slate-400">{finding.id}</span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs font-medium text-slate-600">{finding.facility}</span>
                </div>

                {finding.reviewed_at && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Reviewed: {new Date(finding.reviewed_at).toLocaleDateString()} by {finding.reviewer_name}
                  </span>
                )}
              </div>

              {/* Warning disclaimer for Candidate findings */}
              {finding.status === 'CANDIDATE' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
                  <span>
                    <strong>UNREVIEWED CANDIDATE FINDING:</strong> AI-generated finding requires qualified HSE review before being cited as a verified violation.
                  </span>
                </div>
              )}

              <div>
                <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900">{finding.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{finding.description}</p>
              </div>

              {/* Verbatim Excerpt from TinyFish Fetch */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800">
                    STATUTORY CLAUSE: {finding.applicable_regulation}
                  </span>
                  {finding.source_url && (
                    <a
                      href={finding.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>{finding.source_domain || 'Official Source'}</span>
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  )}
                </div>

                <blockquote className="italic font-mono text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                  "{finding.verified_excerpt}"
                </blockquote>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Internal Standard: {finding.internal_evidence || 'IOGP Safety Standard'}</span>
                  <span className="font-mono">Uncertainty: <strong>{finding.uncertainty_score}</strong></span>
                </div>
              </div>

              {/* Review History / Decisions */}
              {finding.status !== 'CANDIDATE' ? (
                <div className="p-3.5 bg-slate-100 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-slate-500">how_to_reg</span>
                    Review Decision: {finding.status}
                  </div>
                  <p className="text-slate-600 italic">"{finding.reviewer_comments}"</p>
                </div>
              ) : (
                /* Action Bar for Candidate Finding */
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-mono">
                    Awaiting qualified adjudication:
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReview(finding, 'OVERRIDE')}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                    >
                      Override (Dismiss)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenReview(finding, 'ESCALATE')}
                      className="px-3 py-1.5 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 text-xs font-semibold transition-colors"
                    >
                      Escalate to GM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenReview(finding, 'CONFIRM')}
                      className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      Confirm Violation
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
            No compliance findings matching selected filters.
          </div>
        )}
      </div>

      {/* Review Adjudication Modal */}
      {reviewModalOpen && selectedFinding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900">
                Adjudicate Finding: {selectedFinding.id}
              </h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">Finding Title</label>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 font-semibold text-slate-800">
                  {selectedFinding.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Reviewer Identity</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="font-mono font-bold text-slate-700 block mb-1">Adjudication Decision</label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-bold"
                  >
                    <option value="CONFIRM">CONFIRM (Verified Statutory Gap)</option>
                    <option value="OVERRIDE">OVERRIDE (Alternative Control Exists)</option>
                    <option value="ESCALATE">ESCALATE (Executive Review Required)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">Auditor Rationale & Findings Comment</label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="font-mono font-bold text-slate-700 block mb-1">Assigned Corrective Action</label>
                <input
                  type="text"
                  value={actionItem}
                  onChange={(e) => setActionItem(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Recording Adjudication...' : 'Submit HSE Adjudication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
