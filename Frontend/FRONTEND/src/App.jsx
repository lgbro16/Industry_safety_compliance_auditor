import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/layout/AppLayout';

// Core Compliance Auditor Views
import DashboardPage from './pages/DashboardPage';
import SafetyInvestigationPage from './pages/SafetyInvestigationPage';
import RegulatoryIntelligencePage from './pages/RegulatoryIntelligencePage';
import CertificateMonitoringPage from './pages/CertificateMonitoringPage';
import FindingsReviewPage from './pages/FindingsReviewPage';
import AuditTrailPage from './pages/AuditTrailPage';

// Curated Telemetry & Preserved Views
import ReportsRepositoryPage from './pages/ReportsRepositoryPage';
import ReportDetailPage from './pages/ReportDetailPage';
import SiteAnalyticsPage from './pages/SiteAnalyticsPage';
import PatternIntelligencePage from './pages/PatternIntelligencePage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            {/* 1. Executive Dashboard */}
            <Route index element={<DashboardPage />} />

            {/* 2. Safety Investigation & Evidence Correlation */}
            <Route path="investigation" element={<SafetyInvestigationPage />} />
            <Route path="analysis" element={<SafetyInvestigationPage />} />

            {/* 3. Regulatory Intelligence (TinyFish Search & Fetch) */}
            <Route path="regulatory" element={<RegulatoryIntelligencePage />} />

            {/* 4. Certificate Monitoring & Statutory Expiry Tracking */}
            <Route path="certificates" element={<CertificateMonitoringPage />} />

            {/* 5. Findings & Human-in-the-Loop Review Queue */}
            <Route path="findings" element={<FindingsReviewPage />} />
            <Route path="review" element={<FindingsReviewPage />} />

            {/* 6. Audit Trail & Source Provenance Dossier */}
            <Route path="audit" element={<AuditTrailPage />} />
            <Route path="export" element={<AuditTrailPage />} />

            {/* Preserved Telemetry Views */}
            <Route path="reports" element={<ReportsRepositoryPage />} />
            <Route path="reports/:id" element={<ReportDetailPage />} />
            <Route path="analytics" element={<SiteAnalyticsPage />} />
            <Route path="patterns" element={<PatternIntelligencePage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
