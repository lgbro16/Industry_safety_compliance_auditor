import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';
import { useApp } from '../context/AppContext';

export default function CertificateMonitoringPage() {
  const { showToast } = useApp();
  const [certificates, setCertificates] = useState([]);
  const [alertsData, setAlertsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    cert_number: '',
    equipment_id: '',
    equipment_name: '',
    facility: 'Digboi Central Tank Farm',
    cert_type: 'Hydrostatic Pressure Test',
    standard: 'ASME Section VIII / DGMS Standard',
    issuing_body: 'Bureau Veritas Industrial',
    issue_date: '2024-01-15',
    expiry_date: '2027-01-15',
    status: 'VALID',
    notes: ''
  });

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const [resCerts, resAlerts] = await Promise.all([
        fetch(getApiUrl('/api/certificates')),
        fetch(getApiUrl('/api/certificates/alerts'))
      ]);

      if (resCerts.ok) {
        const cJson = await resCerts.json();
        setCertificates(cJson.certificates || []);
      }
      if (resAlerts.ok) {
        const aJson = await resAlerts.json();
        setAlertsData(aJson);
      }
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const body = new FormData();
    body.append('file', file);
    body.append('facility', 'Digboi Central Tank Farm');

    try {
      setUploading(true);
      const res = await fetch(getApiUrl('/api/certificates/upload'), {
        method: 'POST',
        body: body
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed with status ${res.status}`);
      }

      const json = await res.json();
      showToast(json.message || 'Certificate successfully uploaded & registered.');
      loadCertificates();
    } catch (err) {
      console.error('Upload error:', err);
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cert_number || !formData.equipment_id) {
      showToast('Certificate number and Equipment ID are required.');
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/certificates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast('New certificate registered in active database.');
      setShowAddModal(false);
      loadCertificates();
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Failed to add certificate.');
    }
  };

  const summary = alertsData?.summary || { total_certificates: 0, valid: 0, expiring_soon: 0, expired: 0, missing_required: 0 };

  const filteredCerts = certificates.filter((c) => {
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      c.equipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cert_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.facility.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded bg-purple-100 text-purple-800 border border-purple-200">
              EQUIPMENT INTEGRITY REGISTER
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-mono">Statutory Inspection Lifecycle</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-['Public_Sans'] text-slate-900 tracking-tight">
            Equipment Certificate & Statutory Audit Monitoring
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Continuous surveillance of pressure vessel tests, crane wire rope NDT, multi-gas sensor calibrations, and hazardous area certifications. Identifies expired or missing statutory certificates prior to site permit issuance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm shadow-sm cursor-pointer transition-all active:scale-95">
            <span className="material-symbols-outlined text-lg">upload_file</span>
            <span>{uploading ? 'Extracting Metadata...' : 'Upload Certificate File'}</span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm transition-all shadow-blue-500/20 active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Register Metadata
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Total Monitored</span>
          <span className="text-2xl font-extrabold text-slate-900 font-['Public_Sans'] mt-1 block">
            {summary.total_certificates}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 block">Valid Active</span>
          <span className="text-2xl font-extrabold text-emerald-700 font-['Public_Sans'] mt-1 block">
            {summary.valid}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 block">Expiring &lt;30 Days</span>
          <span className="text-2xl font-extrabold text-amber-600 font-['Public_Sans'] mt-1 block">
            {summary.expiring_soon}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-red-200 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-red-700 block">Expired (Overdue)</span>
          <span className="text-2xl font-extrabold text-red-600 font-['Public_Sans'] mt-1 block">
            {summary.expired}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-purple-200 shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-purple-700 block">Missing Mandatory</span>
          <span className="text-2xl font-extrabold text-purple-700 font-['Public_Sans'] mt-1 block">
            {summary.missing_required}
          </span>
        </div>
      </div>

      {/* Critical Equipment Alert Callout */}
      {summary.expired + summary.missing_required > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600 text-xl flex-shrink-0 mt-0.5">error</span>
          <div>
            <h4 className="text-sm font-bold text-red-900 font-['Public_Sans']">
              Statutory Re-inspection Required Before Operational Permit Release
            </h4>
            <p className="text-xs text-red-700 mt-1">
              One or more pressurized vessels or portable gas detectors possess expired or missing statutory test certificates. Under DGMS Oil Mines Regulations and OSHA 1910.146, equipment with lapsed certifications must remain tagged out until proof testing is recertified.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'EXPIRED', 'EXPIRING_SOON', 'MISSING_REQUIRED', 'VALID'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex-shrink-0 ${
                filterStatus === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Records' :
               st === 'EXPIRED' ? 'Expired' :
               st === 'EXPIRING_SOON' ? 'Expiring Soon' :
               st === 'MISSING_REQUIRED' ? 'Missing' : 'Valid'}
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
            placeholder="Search equipment tag, cert #, facility..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600"
          />
        </div>
      </div>

      {/* Certificates Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Equipment Tag</th>
                <th className="py-3 px-4">Certificate #</th>
                <th className="py-3 px-4">Inspection Type & Standard</th>
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Issuing Body</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCerts.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    <div>{cert.equipment_id}</div>
                    <div className="text-[11px] font-normal text-slate-500 truncate max-w-[160px]">
                      {cert.equipment_name}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">{cert.cert_number}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{cert.cert_type}</div>
                    <div className="text-[11px] font-mono text-slate-500">{cert.standard}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{cert.facility}</td>
                  <td className="py-3.5 px-4 text-slate-600">{cert.issuing_body}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                    {cert.expiry_date}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                      cert.status === 'VALID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      cert.status === 'EXPIRING_SOON' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      cert.status === 'EXPIRED' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {cert.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TinyAgent Supplier Integration Readiness Card */}
      <div className="bg-[#0B1528] text-white rounded-xl border border-slate-800 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">smart_toy</span>
            <h3 className="font-bold text-sm text-white font-['Public_Sans']">
              TinyAgent Autonomous Supplier Portal Synchronization
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono text-xs border border-blue-700">
            CONNECTOR ARCHITECTURE READY
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          Architectural adapter configured to allow TinyAgent autonomous web agent synchronization with authorized OEM testing portals (Bureau Veritas, TUV Rheinland, Dräger Service Cloud). Enables periodic automated retrieval of recalibration certificates without manual document handling.
        </p>
        <div className="text-[11px] font-mono text-slate-400 pt-1">
          Governance Integrity: Certificates must never be fabricated; unverified uploaded documents remain explicitly labeled as pending third-party verification.
        </div>
      </div>

      {/* Manual Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-['Public_Sans'] font-bold text-base text-slate-900">
                Register Equipment Certificate
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono font-bold text-slate-600 block mb-1">Equipment Tag *</label>
                  <input
                    type="text"
                    value={formData.equipment_id}
                    onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                    placeholder="e.g. V-102, CR-04"
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-mono font-bold text-slate-600 block mb-1">Certificate # *</label>
                  <input
                    type="text"
                    value={formData.cert_number}
                    onChange={(e) => setFormData({ ...formData, cert_number: e.target.value })}
                    placeholder="e.g. PV-HYD-9981"
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-mono font-bold text-slate-600 block mb-1">Equipment Name</label>
                <input
                  type="text"
                  value={formData.equipment_name}
                  onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                  placeholder="e.g. High Pressure Gas Separator"
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono font-bold text-slate-600 block mb-1">Certificate Type</label>
                  <input
                    type="text"
                    value={formData.cert_type}
                    onChange={(e) => setFormData({ ...formData, cert_type: e.target.value })}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="font-mono font-bold text-slate-600 block mb-1">Issuing Authority</label>
                  <input
                    type="text"
                    value={formData.issuing_body}
                    onChange={(e) => setFormData({ ...formData, issuing_body: e.target.value })}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono font-bold text-slate-600 block mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-mono font-bold text-slate-600 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-sm"
                >
                  Save Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
