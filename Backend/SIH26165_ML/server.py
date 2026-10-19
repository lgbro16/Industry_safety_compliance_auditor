"""
server.py - Industrial Safety Compliance Auditor Backend Server
Kritikal Hacks 2026 - Oil India Limited / Industrial Asset Safety
Powered by TinyFish Search & Fetch APIs + SIF-Guard Explainable AI Core

Features:
- Autonomous Regulatory Intelligence via TinyFish Search + Fetch
- Domain Allowlist & SSRF Safeguards
- Requirement-to-Evidence Correlation & Candidate Findings Generation
- Statutory Certificate Expiry & Gap Monitoring
- Human-in-the-Loop Adjudication & Traceable Audit Trail
- SQLite Persistent Storage for Data Continuity
- Full Backward Compatibility with Legacy SIF-Guard Endpoints
"""

import os
import psutil
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables (.env if present)
load_dotenv()

# Initialize SQLite database schema and baseline data
from ai.storage import (
    init_db,
    get_all_certificates,
    add_certificate,
    get_all_findings,
    review_finding,
    get_regulatory_documents,
    get_audit_trail
)
init_db()

from ai.tinyfish_client import (
    get_tinyfish_status,
    search_tinyfish,
    fetch_tinyfish,
    APPROVED_REGULATORY_DOMAINS
)
from ai.certificate_manager import (
    handle_certificate_upload,
    get_certificate_alerts
)
from ai.investigation_orchestrator import run_compliance_investigation
from ai.hitl import record_review, get_all_reviews
from ai.jobs import create_batch_job, get_job_status

app = Flask(__name__)

# Configure CORS
cors_origins = os.environ.get("CORS_ORIGIN", "*")
if cors_origins != "*":
    cors_origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
CORS(
    app,
    resources={r"/api/*": {"origins": cors_origins if cors_origins != "*" else "*"}},
    supports_credentials=True
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "safety_reports.csv")


# ── 1. ROOT & HEALTH ────────────────────────────────────────────────────────

@app.route('/', methods=['GET'])
def root_index():
    return jsonify({
        'status': 'HEALTHY',
        'product': 'Industrial Safety Compliance Auditor — Kritikal Hacks 2026',
        'organization': 'Oil India Limited / Industrial Safety Assurance',
        'integration': 'TinyFish Search & Fetch APIs + SIF-Guard AI Core',
        'endpoints': {
            'dashboard': '/api/audit/dashboard',
            'investigate': '/api/audit/investigate',
            'regulatory_search': '/api/regulatory/search',
            'regulatory_fetch': '/api/regulatory/fetch',
            'regulatory_documents': '/api/regulatory/documents',
            'certificates': '/api/certificates',
            'certificate_alerts': '/api/certificates/alerts',
            'certificate_upload': '/api/certificates/upload',
            'findings': '/api/findings',
            'audit_trail': '/api/audit/trail',
            'health': '/api/health'
        }
    }), 200


@app.route('/api/health', methods=['GET'])
def health():
    """Returns system status, TinyFish configuration, model governance, and RSS memory."""
    from ai.embeddings import get_embedding_model_name, get_embedding_status
    from ai.llm import get_llm_model_name
    from ai.rag import get_rag_status, get_knowledge_base_version

    emb_status = get_embedding_status()
    rag_info = get_rag_status()
    tf_status = get_tinyfish_status()

    process_rss_mb = None
    try:
        process_rss_mb = round(psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024), 1)
    except Exception:
        pass

    return jsonify({
        'status': 'HEALTHY',
        'product': 'Industrial Safety Compliance Auditor — Kritikal Hacks 2026',
        'organization': 'Oil India Limited',
        'tinyfish_integration': tf_status,
        'embedding_model': get_embedding_model_name(),
        'embedding_status': emb_status.get('status'),
        'llm_model': get_llm_model_name(),
        'knowledge_base_version': get_knowledge_base_version(),
        'rag_status': rag_info.get('status'),
        'server_rss_mb': process_rss_mb,
        'disclaimer': 'AI provides decision support and does not independently certify legal compliance or site safety.'
    }), 200


# ── 2. EXECUTIVE DASHBOARD AGGREGATE ────────────────────────────────────────

@app.route('/api/audit/dashboard', methods=['GET'])
def get_dashboard_metrics():
    """Aggregates all key compliance metrics for the Executive Dashboard view."""
    all_findings = get_all_findings()
    all_certs = get_all_certificates()
    reg_docs = get_regulatory_documents()
    audit_events = get_audit_trail(limit=10)
    tf_status = get_tinyfish_status()

    # Severity distribution
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    status_counts = {"CANDIDATE": 0, "CONFIRMED": 0, "OVERRIDDEN": 0, "ESCALATED": 0}
    for f in all_findings:
        sev = f.get("severity", "MEDIUM").upper()
        st = f.get("status", "CANDIDATE").upper()
        if sev in severity_counts:
            severity_counts[sev] += 1
        if st in status_counts:
            status_counts[st] += 1

    # Certificate breakdown
    cert_counts = {"VALID": 0, "EXPIRING_SOON": 0, "EXPIRED": 0, "MISSING_REQUIRED": 0}
    for c in all_certs:
        c_st = c.get("status", "VALID").upper()
        if c_st in cert_counts:
            cert_counts[c_st] += 1

    # External research activity metrics
    research_events = [e for e in audit_events if e.get("event_type") in ("SEARCH_EXECUTED", "DOCUMENT_FETCHED")]

    return jsonify({
        "facility_overview": {
            "name": "Digboi Central Operations Complex & Field Assets",
            "active_installations": ["Tank Farm", "Wellhead 12", "Compressor Station Alpha", "Rig #04"],
            "total_monitored_assets": len(all_certs),
            "safety_integrity_rating": "SATISFACTORY - AUDIT ACTION REQUIRED" if cert_counts["EXPIRED"] > 0 else "COMPLIANT"
        },
        "findings_by_severity": severity_counts,
        "findings_by_status": status_counts,
        "total_candidate_findings": status_counts["CANDIDATE"],
        "total_confirmed_findings": status_counts["CONFIRMED"],
        "certificates_summary": cert_counts,
        "certificates_requiring_attention": cert_counts["EXPIRED"] + cert_counts["EXPIRING_SOON"] + cert_counts["MISSING_REQUIRED"],
        "recent_regulatory_updates": reg_docs[:5],
        "external_research_activity": {
            "mode": tf_status["mode"],
            "tinyfish_enabled": tf_status["enabled"],
            "has_api_key": tf_status["has_api_key"],
            "total_queries_logged": len(research_events),
            "approved_domains_count": len(APPROVED_REGULATORY_DOMAINS)
        },
        "recent_audit_trail": audit_events[:5]
    }), 200


# ── 3. SAFETY INVESTIGATION & CORRELATION ───────────────────────────────────

@app.route('/api/audit/investigate', methods=['POST'])
def investigate():
    """
    Primary endpoint for Safety Investigation view.
    Receives an incident or observation report, runs SIF risk assessment,
    evaluates and triggers TinyFish external research, correlates internal
    and external evidence, and produces candidate findings.
    """
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text") or data.get("report_text")
    facility = data.get("facility", "Digboi Central Operations")
    force_research = data.get("force_external_research", False)
    actor = data.get("actor", "Lead HSE Safety Officer")

    if not text or not str(text).strip():
        return jsonify({"error": "Safety observation or incident text is required."}), 400

    try:
        result = run_compliance_investigation(
            report_text=text,
            facility=facility,
            force_research=force_research,
            actor=actor
        )
        return jsonify(result), 200
    except Exception as e:
        app.logger.error(f"Investigation error: {e}", exc_info=True)
        return jsonify({
            "error": f"Compliance investigation failed: {str(e)}",
            "disclaimer": "AI provides decision support and must be reviewed by qualified HSE personnel."
        }), 500


# ── 4. REGULATORY INTELLIGENCE (TINYFISH SEARCH & FETCH) ────────────────────

@app.route('/api/regulatory/search', methods=['GET'])
def regulatory_search():
    """Queries TinyFish Search API across approved regulatory domains."""
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify({'error': 'Search query parameter "query" is required.'}), 400

    purpose = request.args.get('purpose', 'Industrial safety regulatory compliance audit')
    location = request.args.get('location', 'US')
    domains_param = request.args.get('domains')
    include_domains = [d.strip() for d in domains_param.split(',') if d.strip()] if domains_param else None

    result = search_tinyfish(
        query=query,
        purpose=purpose,
        include_domains=include_domains,
        location=location
    )
    return jsonify(result), 200


@app.route('/api/regulatory/fetch', methods=['POST'])
def regulatory_fetch():
    """Fetches clean markdown via TinyFish Fetch API with SSRF protection and hash tracking."""
    data = request.get_json(force=True, silent=True) or {}
    urls = data.get('urls', [])
    purpose = data.get('purpose', 'Extract statutory compliance clauses')
    format_type = data.get('format', 'markdown')

    if not urls:
        return jsonify({'error': 'At least one target URL in "urls" list is required.'}), 400

    result = fetch_tinyfish(
        urls=urls,
        purpose=purpose,
        format=format_type
    )
    return jsonify(result), 200


@app.route('/api/regulatory/documents', methods=['GET'])
def regulatory_documents():
    """Returns stored regulatory documents, versions, and change indicators."""
    docs = get_regulatory_documents()
    return jsonify({
        'documents': docs,
        'total': len(docs),
        'approved_domains': APPROVED_REGULATORY_DOMAINS
    }), 200


@app.route('/api/regulatory/domains', methods=['GET'])
def regulatory_domains():
    """Returns approved official regulatory domains allowlist."""
    return jsonify({
        'approved_domains': APPROVED_REGULATORY_DOMAINS,
        'status': get_tinyfish_status()
    }), 200


# ── 5. CERTIFICATE MONITORING ───────────────────────────────────────────────

@app.route('/api/certificates', methods=['GET', 'POST'])
def handle_certificates():
    """
    GET: Returns all certificates, optionally filtered by status (VALID, EXPIRED, EXPIRING_SOON, MISSING_REQUIRED).
    POST: Adds new certificate metadata.
    """
    if request.method == 'POST':
        data = request.get_json(force=True, silent=True) or {}
        required_fields = ['cert_number', 'equipment_id', 'issue_date', 'expiry_date']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({'error': f'Missing required certificate fields: {", ".join(missing)}'}), 400

        res = add_certificate(data)
        return jsonify(res), 201

    status_filter = request.args.get('status')
    certs = get_all_certificates(status_filter=status_filter)
    return jsonify({'certificates': certs, 'total': len(certs)}), 200


@app.route('/api/certificates/alerts', methods=['GET'])
def certificate_alerts():
    """Returns certificate gap alerts and TinyAgent synchronization status."""
    alerts = get_certificate_alerts()
    return jsonify(alerts), 200


@app.route('/api/certificates/upload', methods=['POST'])
def upload_certificate():
    """Uploads a certificate document (.pdf, .png, .jpg, .txt), extracts metadata, and registers."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in request.'}), 400

    file = request.files['file']
    facility = request.form.get('facility', 'Digboi Central Operations')

    if file.filename == '':
        return jsonify({'error': 'No selected file.'}), 400

    try:
        cert_data = handle_certificate_upload(file, file.filename, facility=facility)
        return jsonify({
            'status': 'SUCCESS',
            'message': f'Certificate "{file.filename}" successfully parsed and registered.',
            'certificate': cert_data
        }), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Upload processing failed: {str(e)}'}), 500


# ── 6. FINDINGS AND HUMAN REVIEW WORKFLOW ───────────────────────────────────

@app.route('/api/findings', methods=['GET'])
def get_findings():
    """Returns candidate and reviewed compliance findings with severity and status filters."""
    status_filter = request.args.get('status')
    severity_filter = request.args.get('severity')
    findings = get_all_findings(status_filter=status_filter, severity_filter=severity_filter)
    return jsonify({'findings': findings, 'total': len(findings)}), 200


@app.route('/api/findings/<finding_id>/review', methods=['POST'])
def adjudicate_finding(finding_id):
    """
    Submits human review decision on a candidate finding.
    Decision must be CONFIRM, OVERRIDE, or ESCALATE.
    """
    data = request.get_json(force=True, silent=True) or {}
    decision = data.get('decision', 'CONFIRM').upper()
    reviewer = data.get('reviewer_name') or data.get('reviewer', 'Lead HSE Safety Officer')
    comments = data.get('comments', '')
    action_item = data.get('action_item')

    if decision not in ('CONFIRM', 'OVERRIDE', 'ESCALATE'):
        return jsonify({'error': 'Decision must be one of: CONFIRM, OVERRIDE, ESCALATE'}), 400

    result = review_finding(
        finding_id=finding_id,
        decision=decision,
        reviewer=reviewer,
        comments=comments,
        action_item=action_item
    )
    return jsonify(result), 200


# ── 7. AUDIT TRAIL ──────────────────────────────────────────────────────────

@app.route('/api/audit/trail', methods=['GET'])
def audit_trail():
    """Returns immutable chronological audit logs."""
    limit = int(request.args.get('limit', 100))
    event_type = request.args.get('event_type')
    events = get_audit_trail(limit=limit, event_type=event_type)
    return jsonify({'events': events, 'total': len(events)}), 200


# ── 8. BACKWARD COMPATIBLE SIF-GUARD ENDPOINTS ──────────────────────────────

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Legacy endpoint for backward compatibility."""
    data = request.get_json(force=True, silent=True) or {}
    text = data.get('text', '') or data.get('report_text', '')

    if not text or not str(text).strip():
        return jsonify({'error': 'Report text is required and cannot be empty.'}), 400

    try:
        from ai.analysis import analyze_full_pipeline
        result = analyze_full_pipeline(text)
        return jsonify(result), 200
    except Exception as e:
        app.logger.error(f"Analysis error: {e}", exc_info=True)
        return jsonify({
            'error': f"Safety analysis failed: {str(e)}",
            'disclaimer': "AI-generated analysis is decision support and must be reviewed by qualified HSE personnel."
        }), 500


@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Legacy dataset analytics endpoint."""
    if not os.path.exists(DATA_PATH):
        return jsonify({'error': 'Prototype dataset not found.'}), 404

    try:
        import pandas as pd
        df = pd.read_csv(DATA_PATH)
        total_reports = len(df)
        sif_count = int(df['sif_label'].sum()) if 'sif_label' in df.columns else 0
        non_sif_count = total_reports - sif_count
        sif_rate = round((sif_count / total_reports) * 100.0, 1) if total_reports > 0 else 0.0

        barrier_col = df['barrier_failure'].dropna() if 'barrier_failure' in df.columns else pd.Series([])
        top_barrier = barrier_col.mode()[0] if not barrier_col.empty else "Energy Isolation"

        rule_col = df['iogp_rule'].dropna() if 'iogp_rule' in df.columns else pd.Series([])
        top_rule = rule_col.mode()[0] if not rule_col.empty else "Confined Space Entry"

        facility_col = df['facility_location'].dropna() if 'facility_location' in df.columns else (
            df['location'].dropna() if 'location' in df.columns else pd.Series([])
        )
        facility_counts = facility_col.value_counts().head(5).to_dict()

        return jsonify({
            'dataset_status': 'CURATED PROTOTYPE DATASET',
            'dataset_label': f'Based on {total_reports}-report curated prototype dataset',
            'total_reports': total_reports,
            'sif_precursors': sif_count,
            'non_sif_count': non_sif_count,
            'psif_target_ratio': f"{sif_rate}%",
            'top_barrier_failure': top_barrier,
            'top_life_saving_rule': top_rule,
            'facility_distribution': facility_counts,
            'disclaimer': 'AI-generated analysis is decision support and must be reviewed by qualified HSE personnel.'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/patterns', methods=['GET'])
def get_patterns():
    """Legacy precursor clusters endpoint."""
    try:
        from ai.patterns import discover_precursor_clusters
        clusters = discover_precursor_clusters(num_clusters=3)
        return jsonify({
            'clusters': clusters,
            'dataset_scope': '50 Curated Prototype Safety Reports',
            'methodology': 'Sentence Transformers (all-MiniLM-L6-v2) + K-Means Clustering'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reviews', methods=['GET', 'POST'])
def handle_reviews():
    """Legacy review endpoint."""
    if request.method == 'POST':
        data = request.get_json(force=True, silent=True) or {}
        report_id = data.get('report_id')
        decision = data.get('decision') or data.get('action') or 'CONFIRM'
        comment = data.get('comment') or data.get('notes') or ''
        reviewer = data.get('reviewer', 'Lead HSE Safety Officer')
        prediction = data.get('original_prediction', {})

        if not report_id:
            return jsonify({'error': 'report_id is required'}), 400

        entry = record_review(
            report_id=report_id,
            original_prediction=prediction,
            decision=decision,
            reviewer_comment=comment,
            reviewer_name=reviewer
        )
        return jsonify({'status': 'SUCCESS', 'review': entry}), 201

    reviews = get_all_reviews()
    return jsonify({'reviews': reviews, 'total': len(reviews)}), 200


@app.route('/api/jobs', methods=['POST'])
def create_job():
    data = request.get_json(force=True, silent=True) or {}
    reports = data.get('reports', [])
    if not reports:
        return jsonify({'error': 'reports list is required'}), 400
    job_id = create_batch_job(reports)
    return jsonify({
        'job_id': job_id,
        'status': 'QUEUED',
        'total': len(reports),
        'message': 'Batch processing started in background thread.'
    }), 202


@app.route('/api/jobs/<job_id>', methods=['GET'])
def get_job(job_id):
    job = get_job_status(job_id)
    if not job:
        return jsonify({'error': f'Job {job_id} not found'}), 404
    return jsonify(job), 200


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Industrial Safety Compliance Auditor API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
