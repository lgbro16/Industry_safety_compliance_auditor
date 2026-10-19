import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';
import { useApp } from '../context/AppContext';

export default function AuditTrailPage() {
  const { showToast } = useApp();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAuditEvents = async () => {
    try {
      setLoading(true);
      let url = '/api/audit/trail?limit=150';
      if (filterType !== 'ALL') url += `&event_type=${filterType}`;

      const res = await fetch(getApiUrl(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEvents(json.events || []);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditEvents();
  }, [filterType]);

  const handleExportDossier = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Compliance_Audit_Dossier_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Audit Dossier exported successfully.');
  };

  const filteredEvents = events.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.event_type.toLowerCase().includes(term) ||
      e.actor.toLowerCase().includes(term) ||
      (e.entity_id && e.entity_id.toLowerCase().includes(term))
    );
  });

  const getEventBadge = (type) => {
    switch (type) {
      case 'SEARCH_EXECUTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DOCUMENT_FETCHED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REGULATORY_UPDATE_DETECTED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'INVESTIGATION_RUN':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'FINDING_CREATED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'FINDING_REVIEWED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'CERTIFICATE_ADDED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded bg-slate-200 text-slate-800 border border-slate-300">
              IMMUTABLE GOVERNANCE LEDGER
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-mono">Full Provenance Tracking</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-['Public_Sans'] text-slate-900 tracking-tight">
            Compliance Audit Trail & Source Provenance
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Append-only chronological record tracking every TinyFish search execution, document fetch hash calculation, regulatory version update, safety analysis run, and human-in-the-loop review decision.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportDossier}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm shadow-sm transition-all active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export Audit Dossier (JSON)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'SEARCH_EXECUTED', label: 'TinyFish Search' },
            { id: 'DOCUMENT_FETCHED', label: 'TinyFish Fetch' },
            { id: 'REGULATORY_UPDATE_DETECTED', label: 'Doc Updates' },
            { id: 'INVESTIGATION_RUN', label: 'Audits' },
            { id: 'FINDING_REVIEWED', label: 'Human Reviews' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex-shrink-0 ${
                filterType === item.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search actor, event type, entity ID..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600"
          />
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <span className="font-['Public_Sans'] font-bold text-sm text-slate-900">
            Chronological Events Ledger ({filteredEvents.length} records)
          </span>
          <span className="text-xs font-mono text-slate-500">
            Persisted in SQLite • Non-volatile
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((evt) => (
              <div key={evt.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${getEventBadge(evt.event_type)}`}>
                      {evt.event_type}
                    </span>
                    <span className="font-medium text-slate-800">{evt.actor}</span>
                    {evt.entity_id && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                        {evt.entity_type}: {evt.entity_id}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-slate-400 text-[11px]">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-600 truncate max-w-2xl font-mono">
                    {JSON.stringify(evt.details)}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedEventId(expandedEventId === evt.id ? null : evt.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-mono flex items-center gap-1 flex-shrink-0"
                  >
                    <span>{expandedEventId === evt.id ? 'Hide Details' : 'Inspect Payload'}</span>
                    <span className="material-symbols-outlined text-sm">
                      {expandedEventId === evt.id ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>

                {/* Expanded Payload Inspector */}
                {expandedEventId === evt.id && (
                  <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-x-auto mt-2">
                    <pre>{JSON.stringify(evt, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No audit events found matching filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
