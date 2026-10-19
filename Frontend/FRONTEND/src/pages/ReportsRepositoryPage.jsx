import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ReportsRepositoryPage() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedFacility, setSelectedFacility] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const reports = [
    {
      id: 'PROTO-10231',
      date: '13 Sep 2026',
      time: '02:45 IST',
      facility: 'Duliajan Drilling Rig #4',
      title: 'Energy Isolation Failure During Pump P-302 Maintenance',
      severity: 'SIF CRITICAL',
      severityColor: 'bg-red-100 text-red-700 border-red-200',
      precursorScore: '0.94',
      barrier: 'Energy Isolation / LOTO',
      status: 'UNDER INVESTIGATION',
      statusColor: 'bg-red-50 text-red-700 border-red-200',
      reporter: 'Field HSE Officer (Shift A)'
    },
    {
      id: 'PROTO-10228',
      date: '12 Sep 2026',
      time: '08:15 IST',
      facility: 'Moran Central Tank Farm',
      title: 'Atmospheric H2S Sensor Drift in Crude Tank Diked Zone',
      severity: 'HIGH PRECURSOR',
      severityColor: 'bg-orange-100 text-orange-700 border-orange-200',
      precursorScore: '0.88',
      barrier: 'Gas Detection / Ventilation',
      status: 'HSE REVIEW PENDING',
      statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
      reporter: 'Tank Farm Safety Supervisor'
    },
    {
      id: 'PROTO-10219',
      date: '11 Sep 2026',
      time: '14:20 IST',
      facility: 'Digboi Feeder Line 9',
      title: 'Crane Hoist Wire-Rope Strand Disruption in SIMOPS Corridor',
      severity: 'HIGH PRECURSOR',
      severityColor: 'bg-orange-100 text-orange-700 border-orange-200',
      precursorScore: '0.81',
      barrier: 'Mechanical Integrity',
      status: 'ACTION REQUIRED',
      statusColor: 'bg-blue-50 text-blue-700 border-blue-200',
      reporter: 'Lifting & Rigging Inspector'
    },
    {
      id: 'PROTO-10212',
      date: '10 Sep 2026',
      time: '11:00 IST',
      facility: 'Duliajan Drilling Rig #4',
      title: 'Derrick Floor Dropped Hand Tool (1.2m to Rotary Table)',
      severity: 'MODERATE RISK',
      severityColor: 'bg-amber-100 text-amber-700 border-amber-200',
      precursorScore: '0.54',
      barrier: 'Drop Prevention / Tethering',
      status: 'RESOLVED',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      reporter: 'Derrick Floor Attendant'
    },
    {
      id: 'PROTO-10204',
      date: '08 Sep 2026',
      time: '19:30 IST',
      facility: 'Nahorkatiya Compressor Station',
      title: 'ESD Emergency Shutdown Valve Air Solenoid Slow Stroke Time',
      severity: 'HIGH PRECURSOR',
      severityColor: 'bg-orange-100 text-orange-700 border-orange-200',
      precursorScore: '0.78',
      barrier: 'Emergency Shutdown (ESD)',
      status: 'UNDER INVESTIGATION',
      statusColor: 'bg-red-50 text-red-700 border-red-200',
      reporter: 'Instrumentation Technician'
    },
    {
      id: 'PROTO-10198',
      date: '07 Sep 2026',
      time: '16:10 IST',
      facility: 'Moran Exploration Hub',
      title: 'Expired Gas Monitor Bump Test on Confined Entry Team',
      severity: 'MODERATE RISK',
      severityColor: 'bg-amber-100 text-amber-700 border-amber-200',
      precursorScore: '0.50',
      barrier: 'Permit to Work / Atmospheric',
      status: 'RESOLVED',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      reporter: 'Hole Watch / Standby Person'
    },
    {
      id: 'PROTO-10190',
      date: '05 Sep 2026',
      time: '22:15 IST',
      facility: 'Duliajan Drilling Rig #4',
      title: 'Rotary Bushing Safety Lock Pin Misaligned during Tripping Pipe',
      severity: 'HIGH PRECURSOR',
      severityColor: 'bg-orange-100 text-orange-700 border-orange-200',
      precursorScore: '0.84',
      barrier: 'Line of Fire / Machine Guarding',
      status: 'HSE REVIEW PENDING',
      statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
      reporter: 'Lead Assistant Driller'
    },
  ];

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.barrier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.facility.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      selectedSeverity === 'ALL' ||
      (selectedSeverity === 'CRITICAL' && r.severity === 'SIF CRITICAL') ||
      (selectedSeverity === 'HIGH' && r.severity === 'HIGH PRECURSOR') ||
      (selectedSeverity === 'MODERATE' && r.severity === 'MODERATE RISK');

    const matchesFacility =
      selectedFacility === 'ALL' || r.facility.includes(selectedFacility);

    return matchesSearch && matchesSeverity && matchesFacility;
  });

  const handleExportCSV = () => {
    showToast('Exporting 50 prototype safety incident records with Bow-Tie metadata (CSV)...');
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded tracking-wide">
              REGISTRY-DB
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">table_chart</span>
              SIF Precursor Incident Repository
            </span>
          </div>
          <h1 className="font-['Public_Sans'] font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Safety Observations & SIF Precursor Registry
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Curated prototype repository capturing raw incident reports, AI barrier health evaluations, and HSE review statuses across operational facilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base text-slate-500">file_download</span>
            <span>Export CSV Dataset</span>
          </button>
          <button
            onClick={() => navigate('/analysis')}
            className="h-10 px-4 bg-[#0F1E36] hover:bg-[#162B4D] text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base text-blue-300">add</span>
            <span>Ingest New Observation</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STAT METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="cad-card p-5">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Curated Dataset Reports</div>
          <div className="font-['Public_Sans'] text-2xl font-extrabold text-slate-900 mt-2">50</div>
          <p className="text-xs text-slate-400 mt-1">Prototype safety incident records</p>
        </div>
        <div className="cad-card p-5 border-l-4 border-l-red-600 bg-red-50/20">
          <div className="text-xs font-bold text-red-700 uppercase tracking-wider">SIF Precursor Ratio</div>
          <div className="font-['Public_Sans'] text-2xl font-extrabold text-red-600 mt-2">29 (58.0%)</div>
          <p className="text-xs text-red-600 mt-1">High-consequence potential events</p>
        </div>
        <div className="cad-card p-5 border-l-4 border-l-amber-500">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Active Triage Queue</div>
          <div className="font-['Public_Sans'] text-2xl font-extrabold text-amber-800 mt-2">5 Items</div>
          <p className="text-xs text-slate-500 mt-1">Awaiting formal HSE lead sign-off</p>
        </div>
        <div className="cad-card p-5">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Standard Observations</div>
          <div className="font-['Public_Sans'] text-2xl font-extrabold text-emerald-700 mt-2">21 (42.0%)</div>
          <p className="text-xs text-slate-400 mt-1">Non-SIF nominal observations</p>
        </div>
      </div>

      {/* FILTER CONTROLS TOOLBAR */}
      <div className="cad-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, keyword, asset, or barrier..."
              className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 transition-all"
              type="search"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Risk Classifications</option>
              <option value="CRITICAL">SIF Critical (High Consequence)</option>
              <option value="HIGH">High Precursor</option>
              <option value="MODERATE">Moderate Risk</option>
            </select>

            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Operational Facilities</option>
              <option value="Duliajan">Duliajan Drilling Rig #4</option>
              <option value="Moran">Moran Central Tank Farm</option>
              <option value="Digboi">Digboi Feeder Line 9</option>
              <option value="Nahorkatiya">Nahorkatiya Compressor</option>
            </select>
          </div>
        </div>

        {/* Active Filter Tags */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Showing <strong>{filteredReports.length}</strong> of <strong>50</strong> prototype records</span>
          {(selectedSeverity !== 'ALL' || selectedFacility !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedSeverity('ALL');
                setSelectedFacility('ALL');
                setSearchQuery('');
              }}
              className="text-blue-700 font-semibold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="cad-card overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-bold">Report ID</th>
                <th className="py-3.5 px-4 font-bold">Facility / Asset</th>
                <th className="py-3.5 px-4 font-bold">Incident Observation</th>
                <th className="py-3.5 px-4 font-bold">SIF Risk Score</th>
                <th className="py-3.5 px-4 font-bold">Degraded Barrier</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/reports/${row.id}`)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* ID & Date */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-blue-700 group-hover:underline">{row.id}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{row.date} • {row.time}</div>
                  </td>

                  {/* Facility */}
                  <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-400">domain</span>
                      <span>{row.facility}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{row.reporter}</div>
                  </td>

                  {/* Title / Observation */}
                  <td className="py-4 px-4 min-w-[280px] max-w-md">
                    <div className="font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                      {row.title}
                    </div>
                  </td>

                  {/* SIF Risk Score */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[11px] font-extrabold px-2 py-0.5 rounded border ${row.severityColor}`}>
                        {row.precursorScore}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">{row.severity}</div>
                  </td>

                  {/* Compromised Barrier */}
                  <td className="py-4 px-4 whitespace-nowrap text-slate-700">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-sm text-amber-600">shield</span>
                      <span>{row.barrier}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${row.statusColor}`}>
                      {row.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4 whitespace-nowrap text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reports/${row.id}`);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-[#0F1E36] hover:text-white text-slate-700 font-semibold rounded-md transition-colors text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Investigate</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>Page {currentPage} of 1 • Displaying {filteredReports.length} prototype records</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-400 cursor-not-allowed"
              disabled={true}
            >
              Previous
            </button>
            <button
              className="px-3 py-1.5 rounded font-bold bg-[#0F1E36] text-white"
            >
              1
            </button>
            <button
              className="px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-400 cursor-not-allowed"
              disabled={true}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
