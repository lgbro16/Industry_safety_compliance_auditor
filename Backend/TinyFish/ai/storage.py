"""
storage.py - Persistent SQLite Database Storage for Compliance Auditor
Manages persistence for:
- Monitored Equipment Certificates
- Candidate & Adjudicated Compliance Findings
- Fetched Regulatory Documents (with SHA-256 Hash Versioning)
- Append-Only Audit Trail
"""

import os
import json
import sqlite3
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "compliance_auditor.db")


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes tables and seeds baseline industrial assets and certificates if empty."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Certificates table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS certificates (
            id TEXT PRIMARY KEY,
            cert_number TEXT NOT NULL,
            equipment_id TEXT NOT NULL,
            equipment_name TEXT NOT NULL,
            facility TEXT NOT NULL,
            cert_type TEXT NOT NULL,
            standard TEXT NOT NULL,
            issuing_body TEXT NOT NULL,
            issue_date TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            status TEXT NOT NULL,
            file_path TEXT,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # 2. Candidate & Adjudicated Findings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS findings (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            hazard_category TEXT NOT NULL,
            facility TEXT NOT NULL,
            severity TEXT NOT NULL,
            applicable_regulation TEXT NOT NULL,
            source_url TEXT,
            source_domain TEXT,
            verified_excerpt TEXT,
            internal_evidence TEXT,
            uncertainty_score TEXT NOT NULL,
            uncertainty_rationale TEXT,
            recommended_action TEXT,
            status TEXT NOT NULL,
            report_id TEXT,
            reviewer_name TEXT,
            reviewer_decision TEXT,
            reviewer_comments TEXT,
            reviewed_at TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # 3. Regulatory Documents table with SHA-256 hash tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS regulatory_documents (
            id TEXT PRIMARY KEY,
            url TEXT UNIQUE NOT NULL,
            domain TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            content_markdown TEXT,
            content_hash TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            first_retrieved_at TEXT NOT NULL,
            last_retrieved_at TEXT NOT NULL,
            change_detected INTEGER DEFAULT 0,
            previous_hash TEXT
        )
    """)

    # 4. Append-Only Audit Trail
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            event_type TEXT NOT NULL,
            actor TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details_json TEXT NOT NULL
        )
    """)

    conn.commit()

    # Seed baseline certificates if table is empty
    cursor.execute("SELECT COUNT(*) FROM certificates")
    count = cursor.fetchone()[0]
    if count == 0:
        _seed_baseline_certificates(cursor)
        conn.commit()

    # Seed baseline regulatory guidance if empty
    cursor.execute("SELECT COUNT(*) FROM regulatory_documents")
    doc_count = cursor.fetchone()[0]
    if doc_count == 0:
        _seed_baseline_regulations(cursor)
        conn.commit()

    # Seed initial candidate findings if empty
    cursor.execute("SELECT COUNT(*) FROM findings")
    finding_count = cursor.fetchone()[0]
    if finding_count == 0:
        _seed_baseline_findings(cursor)
        conn.commit()

    conn.close()


def _seed_baseline_certificates(cursor: sqlite3.Cursor):
    now = datetime.now(timezone.utc)
    base_certs = [
        {
            "id": "CERT-2026-001",
            "cert_number": "PV-HYD-88219",
            "equipment_id": "V-102",
            "equipment_name": "High-Pressure Gas Separator Vessel",
            "facility": "Digboi Central Tank Farm",
            "cert_type": "Hydrostatic Pressure Test",
            "standard": "ASME Sec VIII Div 1 / DGMS Standard",
            "issuing_body": "Bureau Veritas Industrial",
            "issue_date": (now - timedelta(days=700)).strftime("%Y-%m-%d"),
            "expiry_date": (now - timedelta(days=20)).strftime("%Y-%m-%d"),
            "status": "EXPIRED",
            "notes": "Overdue mandatory statutory hydrostatic re-testing.",
            "created_at": now.isoformat()
        },
        {
            "id": "CERT-2026-002",
            "cert_number": "CRN-LOAD-4412",
            "equipment_id": "CR-04",
            "equipment_name": "Main Rig Mobile Hydraulic Crane 50T",
            "facility": "Drilling Rig #04 (Moran Field)",
            "cert_type": "Third-Party Load Testing & Wire Rope NDT",
            "standard": "OSHA 1910.180 / DGMS Cir. 02",
            "issuing_body": "TUV Rheinland Safety Inspection",
            "issue_date": (now - timedelta(days=340)).strftime("%Y-%m-%d"),
            "expiry_date": (now + timedelta(days=25)).strftime("%Y-%m-%d"),
            "status": "EXPIRING_SOON",
            "notes": "Inspection scheduled within 30 days before rig mobilization.",
            "created_at": now.isoformat()
        },
        {
            "id": "CERT-2026-003",
            "cert_number": "ATEX-EXD-9901",
            "equipment_id": "MTR-201A",
            "equipment_name": "Explosion-Proof Wellhead Booster Pump Motor",
            "facility": "Wellhead Platform 12",
            "cert_type": "Hazardous Area Zone 1 Electrical Rating",
            "standard": "IECEx / ATEX Ex d IIB T4",
            "issuing_body": "DNV GL Hazardous Environments",
            "issue_date": (now - timedelta(days=180)).strftime("%Y-%m-%d"),
            "expiry_date": (now + timedelta(days=550)).strftime("%Y-%m-%d"),
            "status": "VALID",
            "notes": "Verified active certificate with intact flameproof seals.",
            "created_at": now.isoformat()
        },
        {
            "id": "CERT-2026-004",
            "cert_number": "GAS-CAL-3310",
            "equipment_id": "GD-PORT-09",
            "equipment_name": "Multi-Gas Detector (LEL/H2S/CO/O2)",
            "facility": "Compressor Station Alpha",
            "cert_type": "Sensor Calibration & Bump Test Audit",
            "standard": "NIOSH / OSHA 1910.146 Confined Space Standard",
            "issuing_body": "Dräger Certified Service Center",
            "issue_date": (now - timedelta(days=190)).strftime("%Y-%m-%d"),
            "expiry_date": (now - timedelta(days=10)).strftime("%Y-%m-%d"),
            "status": "EXPIRED",
            "notes": "180-day calibration cycle lapsed; unit must be tagged out.",
            "created_at": now.isoformat()
        },
        {
            "id": "CERT-2026-005",
            "cert_number": "SCFF-TAG-REQ",
            "equipment_id": "SCF-MOD-B",
            "equipment_name": "Work-at-Height Modular Scaffolding",
            "facility": "Flare Header Pipe Rack",
            "cert_type": "Weekly Competent Person Scafftag Inspection",
            "standard": "OSHA 1926.451 / HSE HSG150",
            "issuing_body": "Site HSE Scaffolding Inspector",
            "issue_date": (now - timedelta(days=14)).strftime("%Y-%m-%d"),
            "expiry_date": (now - timedelta(days=7)).strftime("%Y-%m-%d"),
            "status": "MISSING_REQUIRED",
            "notes": "Weekly green Scafftag expired; work suspended pending re-tagging.",
            "created_at": now.isoformat()
        }
    ]

    for c in base_certs:
        cursor.execute("""
            INSERT OR IGNORE INTO certificates
            (id, cert_number, equipment_id, equipment_name, facility, cert_type, standard, issuing_body, issue_date, expiry_date, status, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c["id"], c["cert_number"], c["equipment_id"], c["equipment_name"], c["facility"],
            c["cert_type"], c["standard"], c["issuing_body"], c["issue_date"], c["expiry_date"],
            c["status"], c["notes"], c["created_at"]
        ))


def _seed_baseline_regulations(cursor: sqlite3.Cursor):
    now = datetime.now(timezone.utc)
    base_regs = [
        {
            "id": "REG-OSHA-1910-146",
            "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146",
            "domain": "osha.gov",
            "title": "OSHA 1910.146 - Permit-Required Confined Spaces",
            "description": "Statutory mandates for entry permit systems, atmospheric monitoring, and rescue protocols in confined spaces.",
            "content": "# OSHA 29 CFR 1910.146 Permit-required confined spaces\n\n## (d) Permit-required confined space program\nBefore an employee enters the space, the internal atmosphere shall be tested, with a calibrated, direct-reading instrument, for oxygen content, flammable gases and vapors, and potential toxic air contaminants in that order.\n\n## Continuous Monitoring\nThe atmosphere within the space shall be continuously monitored when entrants are inside to determine that acceptable entry conditions are maintained.",
            "retrieved_at": now.isoformat()
        },
        {
            "id": "REG-OSHA-1910-147",
            "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147",
            "domain": "osha.gov",
            "title": "OSHA 1910.147 - Control of Hazardous Energy (Lockout/Tagout)",
            "description": "Procedures, lockout devices, and verification steps to isolate machines or equipment before servicing.",
            "content": "# OSHA 29 CFR 1910.147 Control of hazardous energy (lockout/tagout)\n\n## (c)(4) Energy control procedure\nProcedures shall be developed, documented and utilized for the control of potentially hazardous energy when employees are engaged in activities covered by this section.\n\n## Verification of Isolation\nPrior to starting work on machines or equipment that have been locked out or tagged out, the authorized employee shall verify that isolation and deenergization of the machine or equipment have been accomplished.",
            "retrieved_at": now.isoformat()
        },
        {
            "id": "REG-DGMS-TECH-CIR-02",
            "url": "https://dgms.gov.in/circulars/tech-safety-hydrocarbon-2024",
            "domain": "dgms.gov.in",
            "title": "DGMS Technical Safety Circular: Pressure Vessels and Lifting Appliances in Oil Mines",
            "description": "Directorate General of Mines Safety regulations governing hydrostatic re-tests and wire rope certifications for drilling installations.",
            "content": "# DGMS (Tech) Safety Guideline: Oil Mines & Installations\n\n## Section 4: Mandatory Periodic Examination of Pressure Vessels\nAll unfired pressure vessels operating under pressure exceeding 1 kg/cm2 shall undergo thorough external examination every 12 months and hydrostatic proof test at 1.5 times design pressure at intervals not exceeding 3 years.\n\n## Section 7: Lifting Appliances and Derricks\nLoad rating certification and ultrasonic crack testing of main load hooks shall be documented prior to spudding or workover operations.",
            "retrieved_at": now.isoformat()
        }
    ]

    for r in base_regs:
        chash = hashlib.sha256(r["content"].encode("utf-8")).hexdigest()
        cursor.execute("""
            INSERT OR IGNORE INTO regulatory_documents
            (id, url, domain, title, description, content_markdown, content_hash, version, first_retrieved_at, last_retrieved_at, change_detected)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            r["id"], r["url"], r["domain"], r["title"], r["description"],
            r["content"], chash, 1, r["retrieved_at"], r["retrieved_at"], 0
        ))


def _seed_baseline_findings(cursor: sqlite3.Cursor):
    now = datetime.now(timezone.utc)
    base_findings = [
        {
            "id": "FND-2026-001",
            "title": "Omission of Pre-entry Multi-gas Testing in Crude Separator V-102",
            "description": "Internal inspection performed inside separator without documented atmospheric logging for oxygen deficiency and toxic H2S.",
            "hazard_category": "Confined Space / Toxic Inhalation",
            "facility": "Digboi Central Tank Farm",
            "severity": "CRITICAL",
            "applicable_regulation": "OSHA 29 CFR 1910.146(d)(5) & DGMS Confined Space Circular",
            "source_url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146",
            "source_domain": "osha.gov",
            "verified_excerpt": "Before an employee enters the space, the internal atmosphere shall be tested with a calibrated direct-reading instrument for oxygen, flammable gases, and toxic air contaminants.",
            "internal_evidence": "IOGP Rule 04: Confined Space Entry permit requires continuous calibrated gas testing.",
            "uncertainty_score": "LOW",
            "uncertainty_rationale": "Direct contradiction between observed entry practice and verified statutory requirement.",
            "recommended_action": "Immediately suspend vessel internal works; recertify atmospheric testing log; calibrate multi-gas monitor GD-PORT-09.",
            "status": "CANDIDATE",
            "report_id": "PROTO-10231",
            "created_at": (now - timedelta(hours=3)).isoformat()
        },
        {
            "id": "FND-2026-002",
            "title": "Pressure Vessel Hydrostatic Retest Lapsed on High-Pressure Gas Separator",
            "description": "Statutory re-test for high-pressure vessel expired 20 days ago while vessel remains energized at 45 bar.",
            "hazard_category": "Pressure Equipment Integrity",
            "facility": "Digboi Central Tank Farm",
            "severity": "HIGH",
            "applicable_regulation": "DGMS Oil Mines Regs / ASME Sec VIII Div 1",
            "source_url": "https://dgms.gov.in/circulars/tech-safety-hydrocarbon-2024",
            "source_domain": "dgms.gov.in",
            "verified_excerpt": "All unfired pressure vessels operating under pressure exceeding 1 kg/cm2 shall undergo hydrostatic proof test at intervals not exceeding 3 years.",
            "internal_evidence": "Asset Register V-102 indicates 3-year statutory interval exceeded.",
            "uncertainty_score": "LOW",
            "uncertainty_rationale": "Certificate CERT-2026-001 is officially marked EXPIRED in active register.",
            "recommended_action": "Schedule depressurization and hydrostatic test by approved third-party inspection agency (Bureau Veritas).",
            "status": "CANDIDATE",
            "report_id": "REG-AUD-002",
            "created_at": (now - timedelta(hours=6)).isoformat()
        },
        {
            "id": "FND-2026-003",
            "title": "Lockout/Tagout Isolation Tag Missing During Booster Pump Impeller Service",
            "description": "Technician replaced mechanical seals with breaker opened but without physical lockout hasp and identification tag.",
            "hazard_category": "Hazardous Energy Isolation (LOTO)",
            "facility": "Wellhead Platform 12",
            "severity": "HIGH",
            "applicable_regulation": "OSHA 29 CFR 1910.147(c)(4)",
            "source_url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147",
            "source_domain": "osha.gov",
            "verified_excerpt": "Prior to starting work on machines or equipment that have been locked out or tagged out, the authorized employee shall verify that isolation and deenergization have been accomplished.",
            "internal_evidence": "IOGP Rule 02: Energy Isolation requires physical lock and tagout on all energy disconnect points.",
            "uncertainty_score": "LOW",
            "uncertainty_rationale": "Breaker switch was opened but lacks lockout device; fails OSHA isolation rule.",
            "recommended_action": "Install standardized lockout hasps and padlocks; retrain maintenance crew on zero energy verification.",
            "status": "CONFIRMED",
            "report_id": "INC-2026-781",
            "reviewer_name": "Senior HSE Auditor K. Sharma",
            "reviewer_decision": "CONFIRM",
            "reviewer_comments": "Verified on site walk. High risk of inadvertent re-energization from MCC room.",
            "reviewed_at": (now - timedelta(days=1)).isoformat(),
            "created_at": (now - timedelta(days=2)).isoformat()
        }
    ]

    for f in base_findings:
        cursor.execute("""
            INSERT OR IGNORE INTO findings
            (id, title, description, hazard_category, facility, severity, applicable_regulation,
             source_url, source_domain, verified_excerpt, internal_evidence, uncertainty_score,
             uncertainty_rationale, recommended_action, status, report_id, reviewer_name,
             reviewer_decision, reviewer_comments, reviewed_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f["id"], f["title"], f["description"], f["hazard_category"], f["facility"],
            f["severity"], f["applicable_regulation"], f.get("source_url"), f.get("source_domain"),
            f.get("verified_excerpt"), f.get("internal_evidence"), f["uncertainty_score"],
            f.get("uncertainty_rationale"), f.get("recommended_action"), f["status"],
            f.get("report_id"), f.get("reviewer_name"), f.get("reviewer_decision"),
            f.get("reviewer_comments"), f.get("reviewed_at"), f["created_at"]
        ))


# ── AUDIT LOGGING HELPER ───────────────────────────────────────────────────

def log_audit_event(event_type: str, actor: str, entity_type: str, entity_id: Optional[str], details: Dict[str, Any]):
    """Appends an immutable audit log record."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO audit_events (timestamp, event_type, actor, entity_type, entity_id, details_json)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (now, event_type, actor, entity_type, entity_id, json.dumps(details, default=str)))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Audit] Log failure notice: {e}")


def get_audit_trail(limit: int = 100, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if event_type:
        cursor.execute("SELECT * FROM audit_events WHERE event_type = ? ORDER BY id DESC LIMIT ?", (event_type, limit))
    else:
        cursor.execute("SELECT * FROM audit_events ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "event_type": r["event_type"],
            "actor": r["actor"],
            "entity_type": r["entity_type"],
            "entity_id": r["entity_id"],
            "details": json.loads(r["details_json"]) if r["details_json"] else {}
        })
    conn.close()
    return results


# ── CERTIFICATE QUERIES ────────────────────────────────────────────────────

def get_all_certificates(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if status_filter:
        cursor.execute("SELECT * FROM certificates WHERE status = ? ORDER BY expiry_date ASC", (status_filter,))
    else:
        cursor.execute("SELECT * FROM certificates ORDER BY expiry_date ASC")
    rows = cursor.fetchall()
    results = [dict(r) for r in rows]
    conn.close()
    return results


def add_certificate(cert_data: Dict[str, Any], actor: str = "HSE Asset Officer") -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cid = cert_data.get("id") or f"CERT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO certificates
        (id, cert_number, equipment_id, equipment_name, facility, cert_type, standard, issuing_body, issue_date, expiry_date, status, file_path, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        cid,
        cert_data["cert_number"],
        cert_data["equipment_id"],
        cert_data.get("equipment_name", "Industrial Asset"),
        cert_data.get("facility", "Main Operational Field"),
        cert_data.get("cert_type", "Compliance Certificate"),
        cert_data.get("standard", "General Safety Standard"),
        cert_data.get("issuing_body", "Inspection Authority"),
        cert_data["issue_date"],
        cert_data["expiry_date"],
        cert_data.get("status", "VALID"),
        cert_data.get("file_path"),
        cert_data.get("notes", ""),
        now
    ))
    conn.commit()
    conn.close()

    log_audit_event("CERTIFICATE_ADDED", actor, "CERTIFICATE", cid, {
        "cert_number": cert_data["cert_number"],
        "equipment_id": cert_data["equipment_id"],
        "status": cert_data.get("status", "VALID"),
        "expiry_date": cert_data["expiry_date"]
    })

    return {"id": cid, "status": "SUCCESS"}


# ── FINDINGS QUERIES ───────────────────────────────────────────────────────

def get_all_findings(status_filter: Optional[str] = None, severity_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM findings WHERE 1=1"
    params = []
    if status_filter:
        query += " AND status = ?"
        params.append(status_filter)
    if severity_filter:
        query += " AND severity = ?"
        params.append(severity_filter)
    query += " ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    results = [dict(r) for r in rows]
    conn.close()
    return results


def save_finding(finding: Dict[str, Any], actor: str = "AI Compliance Auditor Engine") -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    fid = finding.get("id") or f"FND-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT OR REPLACE INTO findings
        (id, title, description, hazard_category, facility, severity, applicable_regulation,
         source_url, source_domain, verified_excerpt, internal_evidence, uncertainty_score,
         uncertainty_rationale, recommended_action, status, report_id, reviewer_name,
         reviewer_decision, reviewer_comments, reviewed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        fid,
        finding["title"],
        finding["description"],
        finding.get("hazard_category", "General Safety"),
        finding.get("facility", "Operational Area"),
        finding.get("severity", "MEDIUM"),
        finding.get("applicable_regulation", "Standard Safety Clause"),
        finding.get("source_url"),
        finding.get("source_domain"),
        finding.get("verified_excerpt"),
        finding.get("internal_evidence"),
        finding.get("uncertainty_score", "MEDIUM"),
        finding.get("uncertainty_rationale"),
        finding.get("recommended_action"),
        finding.get("status", "CANDIDATE"),
        finding.get("report_id"),
        finding.get("reviewer_name"),
        finding.get("reviewer_decision"),
        finding.get("reviewer_comments"),
        finding.get("reviewed_at"),
        finding.get("created_at", now)
    ))
    conn.commit()
    conn.close()

    log_audit_event("FINDING_CREATED", actor, "FINDING", fid, {
        "title": finding["title"],
        "severity": finding.get("severity"),
        "applicable_regulation": finding.get("applicable_regulation"),
        "status": finding.get("status", "CANDIDATE")
    })

    return fid


def review_finding(finding_id: str, decision: str, reviewer: str, comments: str, action_item: Optional[str] = None) -> Dict[str, Any]:
    """Adjudicates a candidate finding: CONFIRM, OVERRIDE, ESCALATE."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    new_status = "CONFIRMED" if decision == "CONFIRM" else ("OVERRIDDEN" if decision == "OVERRIDE" else "ESCALATED")

    cursor.execute("""
        UPDATE findings
        SET status = ?, reviewer_name = ?, reviewer_decision = ?, reviewer_comments = ?, reviewed_at = ?
        WHERE id = ?
    """, (new_status, reviewer, decision, comments, now, finding_id))
    conn.commit()

    cursor.execute("SELECT * FROM findings WHERE id = ?", (finding_id,))
    row = cursor.fetchone()
    finding_dict = dict(row) if row else {}
    conn.close()

    log_audit_event("FINDING_REVIEWED", reviewer, "FINDING", finding_id, {
        "decision": decision,
        "new_status": new_status,
        "comments": comments,
        "action_item": action_item
    })

    return {"status": "SUCCESS", "finding": finding_dict}


# ── REGULATORY DOCUMENTS & VERSION HASHES ─────────────────────────────────

def get_regulatory_documents() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM regulatory_documents ORDER BY last_retrieved_at DESC")
    rows = cursor.fetchall()
    results = [dict(r) for r in rows]
    conn.close()
    return results


def upsert_regulatory_document(doc: Dict[str, Any], actor: str = "TinyFish Discovery Engine") -> Dict[str, Any]:
    """Stores fetched regulatory markdown; compares SHA-256 hash to detect changes."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    url = doc["url"]
    content = doc.get("content_markdown", "")
    new_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

    cursor.execute("SELECT * FROM regulatory_documents WHERE url = ?", (url,))
    existing = cursor.fetchone()

    if existing:
        old_hash = existing["content_hash"]
        old_version = existing["version"]
        if old_hash != new_hash:
            # Change detected!
            cursor.execute("""
                UPDATE regulatory_documents
                SET content_markdown = ?, content_hash = ?, previous_hash = ?, version = ?, last_retrieved_at = ?, change_detected = 1
                WHERE url = ?
            """, (content, new_hash, old_hash, old_version + 1, now, url))
            conn.commit()
            conn.close()

            log_audit_event("REGULATORY_UPDATE_DETECTED", actor, "DOCUMENT", url, {
                "url": url,
                "old_hash": old_hash[:12],
                "new_hash": new_hash[:12],
                "version": old_version + 1
            })
            return {"url": url, "version": old_version + 1, "status": "UPDATED", "change_detected": True, "hash": new_hash}
        else:
            cursor.execute("""
                UPDATE regulatory_documents
                SET last_retrieved_at = ?
                WHERE url = ?
            """, (now, url))
            conn.commit()
            conn.close()
            return {"url": url, "version": old_version, "status": "UNCHANGED", "change_detected": False, "hash": old_hash}
    else:
        doc_id = doc.get("id") or f"REG-{hashlib.md5(url.encode('utf-8')).hexdigest()[:8].upper()}"
        cursor.execute("""
            INSERT INTO regulatory_documents
            (id, url, domain, title, description, content_markdown, content_hash, version, first_retrieved_at, last_retrieved_at, change_detected)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0)
        """, (
            doc_id, url, doc.get("domain", "official-source"),
            doc.get("title", "Regulatory Reference"),
            doc.get("description", ""),
            content, new_hash, now, now
        ))
        conn.commit()
        conn.close()

        log_audit_event("DOCUMENT_FETCHED", actor, "DOCUMENT", url, {
            "url": url,
            "title": doc.get("title"),
            "hash": new_hash[:12]
        })
        return {"url": url, "version": 1, "status": "NEW", "change_detected": False, "hash": new_hash}
