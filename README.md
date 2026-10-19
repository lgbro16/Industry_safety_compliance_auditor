# Industrial Safety Compliance Auditor

> **Autonomous Industrial Safety and Compliance Intelligence Platform**  
> **Core Integration:** TinyFish Search API + TinyFish Fetch API (with TinyAgent integration readiness)  
> **Foundational AI Core:** Explainable SIF Risk Classifier, Entity Precursor Extractor, and Authoritative RAG  
> **Domain Focus:** Serious Injury & Fatality (SIF) Precursors, Statutory Certification & Regulatory Verification

---

## 1. Product Vision & Architecture

Industrial operations generate fragmented observations across near-miss logs, statutory inspection records, equipment certificates, and shifting external regulations. **Industrial Safety Compliance Auditor** connects these siloed streams into an autonomous intelligence system that helps safety personnel:

1. **Discover Relevant Regulations:** Automatically query approved official regulatory bodies (OSHA, DGMS India, HSE UK, NFPA, NIOSH, ISO) using the **TinyFish Search API**.
2. **Retrieve Unadulterated Source Evidence:** Extract clean, token-efficient markdown using the **TinyFish Fetch API**, stripping web boilerplate, ads, and navigation clutter.
3. **Monitor Statutory Certificates:** Track equipment certificates (pressure vessels, mobile cranes, flameproof motors, multi-gas detectors) to flag expired, expiring, or missing mandatory statutory testing before site permits are issued.
4. **Correlate Requirements to Evidence:** Cross-reference incident observations and internal standards with retrieved external statutory mandates to generate traceable candidate findings.
5. **Enforce Human Agency & Governance:** Prevent unreviewed AI predictions from being cited as confirmed violations. All findings undergo a formal Human-in-the-Loop (HITL) review queue with recorded reviewer identity, rationale, and an immutable audit trail.

> **CRITICAL LEGAL & SAFETY DISCLAIMER:**  
> This platform provides decision support and does **not** independently determine legal compliance or certify a facility as safe. All candidate findings require qualification and formal sign-off by authorized Health, Safety & Environment (HSE) personnel.

---

## 2. TinyFish Integration Architecture

The platform integrates genuine TinyFish APIs:

| API | Method | Live Endpoint | Role & Behavior |
| :--- | :--- | :--- | :--- |
| **Search API** | `GET` | `https://api.search.tinyfish.ai` | Performs fast, rank-stable search queries restricted to allowlisted official domains (`include_domains`). Returns structured titles, snippets, and URLs. |
| **Fetch API** | `POST` | `https://api.fetch.tinyfish.ai` | Renders URLs in a real headless browser, strips noise, and returns clean markdown text (`format: "markdown"`). Computes SHA-256 content hashes to detect regulatory document version changes. |

### Security & Reliability Safeguards:
- **Zero Client-Side Exposure:** `TINYFISH_API_KEY` is strictly confined to backend environment variables. It is never exposed to React code, browser network traffic, client bundles, or Git commits.
- **SSRF Protection & Domain Allowlist:** All target URLs are parsed and validated prior to external request execution. Private IP networks (RFC 1918), loopback addresses (`127.0.0.1`, `localhost`), and cloud metadata IP (`169.254.169.254`) are strictly blocked.
- **Approved Official Regulatory Domains:**
  `osha.gov`, `dgms.gov.in`, `hse.gov.uk`, `cdc.gov` (NIOSH), `iso.org`, `nfpa.org`, `epa.gov`, `iogp.org`, `ilo.org`, `bsee.gov`, `csb.gov`, `api.org`, `ansi.org`.
- **High-Fidelity Offline / Fallback Mode:** When `TINYFISH_ENABLED=false` or no API key is provided, the platform automatically switches to an offline simulation mode with curated statutory clauses from OSHA and DGMS. The UI transparently indicates the operational mode.

---

## 3. Core Technical Architecture & Functional Modules

### Proven Analytical Foundation Modules:
- **Hybrid SIF Classifier:** Leakage-free TF-IDF and Random Forest model (`classifier.py`) predicting SIF potential and risk score (0–100%).
- **Structured Precursor Extraction:** Extraction of activities, locations, hazards, barrier breaches, and consequences (`extraction.py`).
- **Semantic Life-Saving Rules (LSR):** Dense embedding matching against IOGP standardized life-saving rules (`lsr.py`).
- **Internal Safety Evidence RAG:** FAISS vector index querying internal clauses and operating procedures (`rag.py`).
- **Grounded LLM Layer:** Google Gemini 2.5 Flash / offline grounded explanation generator (`llm.py`).

### New Modules Built for Compliance Auditor:
- **`ai/tinyfish_client.py`:** Official client for TinyFish Search and Fetch APIs with SSRF prevention, allowlist validation, timeout handling, and offline fallback.
- **`ai/regulatory_discovery.py`:** Autonomous trigger evaluation, targeted query synthesis, search/fetch pipeline orchestration, and document version tracking.
- **`ai/evidence_correlation.py`:** Requirement-to-evidence correlation engine extracting verbatim excerpts and formulating candidate findings with uncertainty ratings.
- **`ai/certificate_manager.py`:** Equipment certificate registry, statutory gap alert synthesis, secure upload validation (`.pdf`, `.png`, `.jpg`, `.txt`), and TinyAgent connector readiness.
- **`ai/investigation_orchestrator.py`:** Unified orchestrator bridging SIF classification, internal RAG, TinyFish search/fetch, and candidate finding synthesis.
- **`ai/storage.py`:** Persistent SQLite database (`compliance_auditor.db`) for certificates, candidate findings, fetched regulatory documents with SHA-256 hashes, and append-only audit logs.
- **`server.py`:** Expanded REST API exposing the full suite of compliance endpoints.
- **React Frontend (6 Core Views):** Complete industrial design system built with Tailwind CSS, Lucide React, and Material Symbols.

---

## 4. Product Views

1. **Executive Dashboard (`/`):**
   - Active facility asset overview (Digboi Central Complex, Rig #04, Platform 12, Compressor Alpha).
   - Candidate findings categorized by severity (Critical, High, Medium, Low).
   - Certificates requiring immediate compliance intervention.
   - Recently retrieved regulatory intelligence feed with SHA-256 verification.
   - External research activity gauge and quick-action scenario launchers.

2. **Safety Investigation Studio (`/investigation`):**
   - Interactive observation input with authentic pre-configured scenario presets.
   - SIF risk assessment and precursor factor extraction.
   - Configurable trigger criteria for external research (automatic on high risk / severe hazard or manual force).
   - Separate side-by-side tabs for internal evidence vs external TinyFish regulatory evidence.
   - Generated candidate findings with verbatim excerpts, source URLs, uncertainty ratings, and recommended follow-ups.

3. **Regulatory Intelligence (`/regulatory`):**
   - Search bar powered by the TinyFish Search API with domain and jurisdiction filters.
   - Direct execution of TinyFish Fetch to extract clean markdown.
   - Document reader displaying version number, retrieval timestamp, and SHA-256 content hash.
   - Version history tracking with automated change detection alerts.

4. **Certificate Monitoring (`/certificates`):**
   - Complete inventory of monitored equipment certificates (pressure vessels, cranes, gas monitors).
   - Expiry calculation (Valid, Expiring Soon, Expired, Missing Mandatory).
   - Drag-and-drop file upload with automated metadata extraction.
   - TinyAgent connector readiness card for automated OEM supplier portal synchronization.

5. **Findings & Review Queue (`/findings`):**
   - Centralized compliance review queue with status filters (`CANDIDATE`, `CONFIRMED`, `OVERRIDDEN`, `ESCALATED`).
   - Strict visual warning banners on unreviewed candidate findings.
   - Formal adjudication modal recording reviewer name, decision, and corrective action items.

6. **Audit Trail & Source Provenance (`/audit`):**
   - Chronological immutable event ledger tracking search calls, document fetches, hash updates, analysis runs, and review adjudications.
   - Interactive payload inspector for full cryptographic transparency.
   - Export Audit Dossier button downloading structured JSON records.

---

## 5. Setup & Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Backend Configuration
1. Navigate to the backend directory:
   ```bash
   cd Backend/SIH26165_ML
   ```
2. Configure `.env` (or copy from `.env.example`):
   ```ini
   PORT=5000
   FLASK_ENV=development
   CORS_ORIGIN=*

   # TinyFish API Key from https://agent.tinyfish.ai/api-keys
   TINYFISH_API_KEY=your_tinyfish_api_key_here
   TINYFISH_ENABLED=true
   TINYFISH_SEARCH_ENDPOINT=https://api.search.tinyfish.ai
   TINYFISH_FETCH_ENDPOINT=https://api.fetch.tinyfish.ai
   TINYFISH_TIMEOUT=12
   ```
3. Run the backend tests:
   ```bash
   python tests/test_auditor_backend.py
   ```
4. Start the backend server:
   ```bash
   python server.py
   ```
   Backend starts on `http://127.0.0.1:5000`.

### Frontend Configuration
1. Navigate to the frontend directory:
   ```bash
   cd Frontend/FRONTEND
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
   Frontend starts on `http://localhost:5173`. Vite automatically proxies `/api` requests to `http://127.0.0.1:5000`.

4. Build production bundle:
   ```bash
   npm run build
   ```

---

## 6. Verification & Test Results

The backend test suite (`tests/test_auditor_backend.py`) verifies:
- **SSRF Protection:** Rejects localhost, loopback (`127.0.0.1`), private RFC 1918 subnets, and cloud metadata (`169.254.169.254`). Accepts approved regulatory domains (`osha.gov`, `dgms.gov.in`).
- **TinyFish Search & Fetch Execution:** Verifies response schema, rank stability, markdown extraction, and hash generation.
- **Certificate Lifecycle & Expiry:** Verifies extraction of equipment tags, certificate numbers, and status assignment (`EXPIRED`, `EXPIRING_SOON`, `VALID`).
- **Requirement-to-Evidence Correlation:** Verifies candidate finding formulation with verbatim excerpts and statutory citations.
- **Human-in-the-Loop Review Adjudication:** Verifies that reviewer decisions update SQLite status and append immutable audit log records.

Test output:
```
Ran 6 tests in 0.092s
OK
```

Frontend production build (`npm run build`):
```
✓ 41 modules transformed.
dist/index.html                   1.24 kB │ gzip:   0.62 kB
dist/assets/index-B-3Bpr9S.css   44.35 kB │ gzip:   8.33 kB
dist/assets/index-sFGjBMzt.js   421.42 kB │ gzip: 114.31 kB
✓ built in 2.08s
```

---

## 7. Connecting to a NEW GitHub Repository (Safe Git Workflow)

The reference safety baseline was kept completely untouched and pristine. This project has its own independent Git repository with no remote pointing to any external repository.

To publish this new project to a NEW GitHub repository:

1. Create a **new repository** on GitHub (e.g. `industrial-safety-compliance-auditor` on your account).
2. Ensure you do **NOT** link it to the original repository.
3. In the project root, verify that no remote exists:
   ```bash
   git remote -v
   ```
4. Add your files and create the initial commit:
   ```bash
   git add .
   git commit -m "feat: initial release of Industrial Safety Compliance Auditor with TinyFish integration"
   ```
5. Add the **NEW** remote origin:
   ```bash
   git remote add origin https://github.com/<your-username>/industrial-safety-compliance-auditor.git
   ```
6. Verify origin points to the NEW repository:
   ```bash
   git remote -v
   ```
7. Push to the new repository:
   ```bash
   git push -u origin main
   ```

---

## 8. Deployment Guidelines

### Backend Deployment (e.g. Render / Railway / Cloud Run)
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn server:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120`
- Environment variables:
  - `TINYFISH_API_KEY`: Your TinyFish API key
  - `TINYFISH_ENABLED`: `true`
  - `CORS_ORIGIN`: Your production frontend domain URL

### Frontend Deployment (e.g. Vercel)
- Root directory: `Frontend/FRONTEND`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_API_BASE_URL`: Full URL of deployed backend (e.g. `https://auditor-api.onrender.com`)

---

## 9. Limitations & Planned Extensions

1. **TinyAgent Authorized Supplier Connector:** The architecture includes the hook and data schema for TinyAgent supplier portal integration; direct automated credentialed login to third-party OEM portals can be activated when supplier credentials are provided.
2. **OCR for Scanned Physical Certificates:** Currently parses text, JSON, and clean PDF documents; full optical character recognition for handwritten or low-resolution physical stamped tags is planned for a subsequent release.
3. **Multi-jurisdiction Localization:** Approved allowlist focuses on US OSHA, Indian DGMS, UK HSE, NFPA, and international ISO/IOGP standards. Regional safety acts for other nations can be appended to `APPROVED_REGULATORY_DOMAINS`.
