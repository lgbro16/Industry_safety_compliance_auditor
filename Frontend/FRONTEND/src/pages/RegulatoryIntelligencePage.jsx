import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';
import { useApp } from '../context/AppContext';

export default function RegulatoryIntelligencePage() {
  const { showToast } = useApp();
  const [query, setQuery] = useState('permit required confined space atmospheric testing');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [location, setLocation] = useState('US');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [fetchingUrl, setFetchingUrl] = useState(null);
  const [fetchedDoc, setFetchedDoc] = useState(null);
  const [storedDocs, setStoredDocs] = useState([]);
  const [approvedDomains, setApprovedDomains] = useState([]);
  const [error, setError] = useState(null);

  // Load stored documents and domains on mount
  const loadStoredDocuments = async () => {
    try {
      const res = await fetch(getApiUrl('/api/regulatory/documents'));
      if (res.ok) {
        const json = await res.json();
        setStoredDocs(json.documents || []);
        setApprovedDomains(json.approved_domains || []);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  useEffect(() => {
    loadStoredDocuments();
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    try {
      setSearching(true);
      setError(null);
      let url = `/api/regulatory/search?query=${encodeURIComponent(query)}&location=${location}`;
      if (selectedDomain) {
        url += `&domains=${encodeURIComponent(selectedDomain)}`;
      }

      const res = await fetch(getApiUrl(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSearchResults(json);
      showToast(`TinyFish returned ${json.total_results || 0} regulatory results.`);
    } catch (err) {
      console.error('Search error:', err);
      setError('Regulatory search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleFetchUrl = async (targetUrl) => {
    try {
      setFetchingUrl(targetUrl);
      setError(null);
      const res = await fetch(getApiUrl('/api/regulatory/fetch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [targetUrl],
          purpose: `Extract statutory compliance clauses for: ${query}`,
          format: 'markdown'
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.results && json.results.length > 0) {
        setFetchedDoc(json.results[0]);
        showToast('Document successfully fetched via TinyFish Fetch API.');
        loadStoredDocuments();
      } else {
        throw new Error('No content returned for target URL.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Failed to fetch document: ${err.message}`);
    } finally {
      setFetchingUrl(null);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
            TINYFISH SEARCH + FETCH ENGINE
          </span>
          <span className="text-slate-400 text-xs">•</span>
          <span className="text-xs text-slate-500 font-mono">Official Regulatory Allowlist</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold font-['Public_Sans'] text-slate-900 tracking-tight">
          Regulatory Intelligence & Standards Discovery
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Search and extract authoritative clauses directly from OSHA, DGMS, HSE UK, NFPA, and ISO. TinyFish renders pages in real-time and returns clean markdown stripped of boilerplate and navigation.
        </p>
      </div>

      {/* Search Input Card */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 text-xl pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search regulatory standards (e.g. OSHA 1910.146 atmospheric testing, DGMS pressure vessels)..."
              className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Approved Domains</option>
              <option value="osha.gov">osha.gov (US OSHA)</option>
              <option value="dgms.gov.in">dgms.gov.in (India DGMS)</option>
              <option value="hse.gov.uk">hse.gov.uk (UK HSE)</option>
              <option value="nfpa.org">nfpa.org (NFPA Fire)</option>
              <option value="cdc.gov">cdc.gov (NIOSH)</option>
              <option value="iogp.org">iogp.org (IOGP Oil & Gas)</option>
            </select>

            <button
              type="submit"
              disabled={searching}
              className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
            >
              {searching ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">travel_explore</span>
                  <span>TinyFish Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Query Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-slate-400">Try queries:</span>
          {[
            'permit required confined space atmospheric testing',
            'lockout tagout energy control verification osha 1910.147',
            'scaffolding competent person inspection 1926.451',
            'unfired pressure vessel hydrostatic test dgms',
            'mobile crane wire rope ndt inspection requirements'
          ].map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setQuery(q); }}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono transition-colors"
            >
              {q.substring(0, 35)}...
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Main Split View: Search Results & Fetched Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Search Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-['Public_Sans'] font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-lg">manage_search</span>
              TinyFish Search Results
            </h2>
            {searchResults && (
              <span className="text-xs font-mono text-slate-500">
                Mode: <strong className="text-slate-800">{searchResults.mode}</strong>
              </span>
            )}
          </div>

          <div className="space-y-3">
            {searchResults?.results?.length > 0 ? (
              searchResults.results.map((r, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[10px] flex items-center justify-center">
                        #{r.position}
                      </span>
                      <span className="font-mono font-bold text-slate-700 uppercase">{r.site_name}</span>
                    </div>
                    {r.is_approved_domain && (
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                        APPROVED AUTHORITY
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">{r.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{r.snippet}</p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-blue-600 hover:underline truncate max-w-[240px]"
                    >
                      {r.url}
                    </a>

                    <button
                      type="button"
                      disabled={fetchingUrl === r.url}
                      onClick={() => handleFetchUrl(r.url)}
                      className="px-3 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded font-medium text-xs transition-colors flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                    >
                      {fetchingUrl === r.url ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span>Fetching...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>Fetch Text</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs space-y-2">
                <span className="material-symbols-outlined text-slate-300 text-4xl block mx-auto">policy</span>
                <p>Run a search query to retrieve live regulatory guidance from approved domains.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Fetched Document Reader */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-['Public_Sans'] font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-lg">description</span>
              TinyFish Clean Markdown Reader
            </h2>
            {fetchedDoc && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                {fetchedDoc.change_detected ? 'UPDATED VERSION' : 'HASH VERIFIED'}
              </span>
            )}
          </div>

          {fetchedDoc ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              {/* Document Metadata Bar */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-bold text-slate-800">{fetchedDoc.title}</span>
                  <span>Version {fetchedDoc.version || 1}</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  URL: <a href={fetchedDoc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{fetchedDoc.url}</a>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                  <span>SHA-256: {fetchedDoc.content_hash || 'Computed'}</span>
                  <span>{new Date(fetchedDoc.retrieval_timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Clean Markdown Content */}
              <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200 max-h-[500px] overflow-y-auto text-xs font-mono leading-relaxed text-slate-800 whitespace-pre-wrap">
                {fetchedDoc.text}
              </div>

              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 text-blue-900 text-xs">
                <strong>Provenance Guarantee:</strong> Clean text rendered directly by TinyFish Fetch without ads, sidebars, or markup clutter. Up to 90% fewer tokens.
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs space-y-2">
              <span className="material-symbols-outlined text-slate-300 text-4xl block mx-auto">article</span>
              <p>Click "Fetch Text" on any search result to extract verified statutory clauses.</p>
            </div>
          )}

          {/* Stored Documents History Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-['Public_Sans'] font-bold text-sm text-slate-900 flex items-center justify-between">
              <span>Persisted Regulatory Corpus ({storedDocs.length})</span>
              <span className="text-xs font-mono text-slate-400">SQLite Cached</span>
            </h3>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {storedDocs.map((doc, idx) => (
                <div
                  key={idx}
                  onClick={() => setFetchedDoc({
                    title: doc.title,
                    url: doc.url,
                    text: doc.content_markdown,
                    version: doc.version,
                    content_hash: doc.content_hash,
                    retrieval_timestamp: doc.last_retrieved_at,
                    change_detected: doc.change_detected
                  })}
                  className="py-2.5 px-2 hover:bg-slate-50 rounded cursor-pointer transition-colors flex items-center justify-between text-xs"
                >
                  <div className="truncate max-w-[280px]">
                    <div className="font-semibold text-slate-800 truncate">{doc.title}</div>
                    <div className="font-mono text-[10px] text-slate-400 truncate">{doc.url}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      v{doc.version}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
