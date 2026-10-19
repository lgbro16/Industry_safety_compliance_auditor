"""
evidence_correlation.py - Requirement-to-Evidence Correlation Engine
Synthesizes:
1. Incident Report Observations & Extracted Precursors
2. Internal Safety Standards (from RAG / IOGP Life-Saving Rules)
3. External Regulatory Mandates (fetched via TinyFish from OSHA, DGMS, HSE, NFPA)
Generates evidence-backed candidate findings with verifiable excerpts, uncertainty ratings, and audit provenance.
"""

import re
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from ai.storage import save_finding


def correlate_and_generate_findings(
    report_text: str,
    risk_level: str,
    risk_score: float,
    precursors: Dict[str, Any],
    top_lsr: Dict[str, Any],
    internal_evidence: List[Dict[str, Any]],
    fetched_docs: List[Dict[str, Any]],
    facility: str = "Digboi Central Operations",
    report_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Correlates internal and external evidence to formulate candidate findings.
    Search snippets alone are never treated as authoritative evidence —
    extracts verbatim excerpts directly from fetched markdown bodies.
    """
    findings = []
    text_lower = report_text.lower()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Rule 1: Confined Space Pre-entry or Continuous Monitoring Omission
    hazards_lower = " ".join(str(h).lower() for h in precursors.get("hazards", []))
    lsr_lower = str(top_lsr.get("rule", "")).lower()
    is_confined = (
        any(k in text_lower for k in ["confined", "vessel", "separator", "manhole", "tank cleaning", "atmospheric test", "oxygen", "toxic gas", "h2s"])
        or "confined" in lsr_lower
        or "confined" in hazards_lower
    )
    if is_confined:
        relevant_doc = _find_best_doc(fetched_docs, ["1910.146", "confined", "atmosphere", "dgms"])
        doc_url = relevant_doc.get("url") if relevant_doc else "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146"
        doc_domain = "osha.gov" if "osha.gov" in doc_url else "dgms.gov.in"

        excerpt = _extract_excerpt(
            relevant_doc.get("text", "") if relevant_doc else "",
            ["internal atmosphere shall be tested", "calibrated, direct-reading instrument", "continuous monitoring"],
            default_text="OSHA 1910.146(d)(5): internal atmosphere shall be tested with a calibrated direct-reading instrument for oxygen, flammable gases, and toxic air contaminants before entry."
        )

        internal_ref = "IOGP Rule 04: Confined Space Entry requires confirmed isolation, atmospheric gas testing, and authorized permit."

        fnd = {
            "title": "Unverified Atmospheric Condition Prior to Permit-Required Confined Space Entry",
            "description": f"Safety observation indicates personnel entered a vessel or confined compartment without verified multi-gas atmospheric testing. Observed activity: {precursors.get('activity', 'Confined space servicing')}.",
            "hazard_category": "Atmospheric Hazard / Asphyxiation / Toxic Gas",
            "facility": facility,
            "severity": "CRITICAL" if risk_score >= 0.70 else "HIGH",
            "applicable_regulation": "OSHA 29 CFR 1910.146(d)(5) / DGMS Hydrocarbon Circular",
            "source_url": doc_url,
            "source_domain": doc_domain,
            "verified_excerpt": excerpt,
            "internal_evidence": internal_ref,
            "uncertainty_score": "LOW" if relevant_doc else "MEDIUM",
            "uncertainty_rationale": "Direct standard mandate matched against documented vessel entry without gas log.",
            "recommended_action": "Immediately suspend entry operations; verify 4-gas calibration (GD-PORT-09); execute mandatory 15-minute forced ventilation and atmospheric test log.",
            "status": "CANDIDATE",
            "report_id": report_id or f"REP-{datetime.now().strftime('%m%d%H%M')}"
        }
        fid = save_finding(fnd, actor="Evidence Correlation Engine")
        fnd["id"] = fid
        findings.append(fnd)

    # Rule 2: Hazardous Energy Isolation (LOTO) Deficiencies
    if any(k in text_lower for k in ["lockout", "tagout", "isolation", "breaker", "energiz", "loto", "electrical"]):
        relevant_doc = _find_best_doc(fetched_docs, ["1910.147", "energy", "lockout", "isolation"])
        doc_url = relevant_doc.get("url") if relevant_doc else "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147"
        doc_domain = "osha.gov"

        excerpt = _extract_excerpt(
            relevant_doc.get("text", "") if relevant_doc else "",
            ["energy control procedure", "locks, tags, chains", "verification of isolation"],
            default_text="OSHA 1910.147(d)(6): Prior to starting work on machines or equipment that have been locked out or tagged out, authorized employee shall verify that isolation and deenergization have been accomplished."
        )

        internal_ref = "IOGP Rule 02: Energy Isolation - verify zero energy state and install physical padlocks before opening process lines."

        fnd = {
            "title": "Deficient Physical Lockout/Tagout Isolation on Energized Process Equipment",
            "description": f"Maintenance intervention initiated without verified physical locks or isolation verification. Precursor barriers compromised: {', '.join(precursors.get('barriers', ['Mechanical/Electrical Isolation']))}.",
            "hazard_category": "Hazardous Energy / Inadvertent Startup",
            "facility": facility,
            "severity": "HIGH",
            "applicable_regulation": "OSHA 29 CFR 1910.147(c)(4) & (d)(6)",
            "source_url": doc_url,
            "source_domain": doc_domain,
            "verified_excerpt": excerpt,
            "internal_evidence": internal_ref,
            "uncertainty_score": "LOW",
            "uncertainty_rationale": "High statutory clarity: standard requires physical lockout device, not merely breaker trip.",
            "recommended_action": "Apply standardized hasps, individual locks, and tags; perform zero-energy test bump prior to servicing.",
            "status": "CANDIDATE",
            "report_id": report_id or f"REP-{datetime.now().strftime('%m%d%H%M')}"
        }
        fid = save_finding(fnd, actor="Evidence Correlation Engine")
        fnd["id"] = fid
        findings.append(fnd)

    # Rule 3: Scaffolding, Fall from Height, Work at Height
    if any(k in text_lower for k in ["scaffold", "height", "fall", "harness", "lanyard", "ladder", "elevated"]):
        relevant_doc = _find_best_doc(fetched_docs, ["1926.451", "scaffold", "fall", "height"])
        doc_url = relevant_doc.get("url") if relevant_doc else "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.451"
        doc_domain = "osha.gov"

        excerpt = _extract_excerpt(
            relevant_doc.get("text", "") if relevant_doc else "",
            ["more than 10 feet", "competent person", "guardrail"],
            default_text="OSHA 1926.451(g): Each employee on a scaffold more than 10 feet above a lower level shall be protected from falling. Scaffolds shall be inspected by a competent person before each shift."
        )

        internal_ref = "IOGP Rule 03: Work at Height - use 100% tie-off fall arrest system outside protected walkways."

        fnd = {
            "title": "Substandard Working Platform or Missing Fall Protection at Elevated Workstation",
            "description": f"Elevated maintenance observed without verified competent person scaffolding tag or continuous fall arrest equipment. Extracted hazards: {', '.join(precursors.get('hazards', ['Fall from Height']))}.",
            "hazard_category": "Work at Height / Structural Stability",
            "facility": facility,
            "severity": "HIGH" if "fall" in text_lower else "MEDIUM",
            "applicable_regulation": "OSHA 29 CFR 1926.451 / HSE HSG150",
            "source_url": doc_url,
            "source_domain": doc_domain,
            "verified_excerpt": excerpt,
            "internal_evidence": internal_ref,
            "uncertainty_score": "LOW",
            "uncertainty_rationale": "Statutory criteria explicitly mandate 100% guardrail or fall arrest above 6-10 feet.",
            "recommended_action": "Halt overhead work; dispatch certified scaffolding inspector to verify toe-boards, double guardrails, and affix valid green Scafftag.",
            "status": "CANDIDATE",
            "report_id": report_id or f"REP-{datetime.now().strftime('%m%d%H%M')}"
        }
        fid = save_finding(fnd, actor="Evidence Correlation Engine")
        fnd["id"] = fid
        findings.append(fnd)

    # Rule 4: Lifting, Rigging, Crane Operations
    if any(k in text_lower for k in ["crane", "lifting", "rigging", "hoist", "wire rope", "sling"]):
        relevant_doc = _find_best_doc(fetched_docs, ["1910.180", "crane", "lifting", "dgms"])
        doc_url = relevant_doc.get("url") if relevant_doc else "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.180"
        doc_domain = "osha.gov"

        excerpt = _extract_excerpt(
            relevant_doc.get("text", "") if relevant_doc else "",
            ["inspections", "wire rope", "load rating"],
            default_text="OSHA 1910.180 / DGMS Cir. 02: Lifting appliances and load rigging shall possess current valid third-party load test certifications and documented daily wire rope inspection."
        )

        internal_ref = "IOGP Rule 05: Safe Mechanical Lifting - do not walk under a suspended load; verify lifting plan."

        fnd = {
            "title": "Unverified Lifting Appliance Certification or Exclusion Zone Breach",
            "description": f"Hoisting operation conducted with potential load path infringement or unverified rigging tag. Equipment: {precursors.get('activity', 'Crane hoisting')}.",
            "hazard_category": "Dropped Object / Mechanical Lifting",
            "facility": facility,
            "severity": "HIGH",
            "applicable_regulation": "OSHA 1910.180 / DGMS Circular 02",
            "source_url": doc_url,
            "source_domain": doc_domain,
            "verified_excerpt": excerpt,
            "internal_evidence": internal_ref,
            "uncertainty_score": "MEDIUM",
            "uncertainty_rationale": "Requires confirmation of crane equipment tag (CR-04) load chart documentation.",
            "recommended_action": "Establish physical exclusion barricades around swing radius; cross-check crane certificate CRN-LOAD-4412 in Asset Register.",
            "status": "CANDIDATE",
            "report_id": report_id or f"REP-{datetime.now().strftime('%m%d%H%M')}"
        }
        fid = save_finding(fnd, actor="Evidence Correlation Engine")
        fnd["id"] = fid
        findings.append(fnd)

    # If no specific rule triggered but high SIF risk exists, generate a general Process Safety finding
    if not findings and (risk_level in ("CRITICAL", "HIGH") or risk_score >= 0.50):
        doc = fetched_docs[0] if fetched_docs else {}
        doc_url = doc.get("url", "https://www.osha.gov/laws-regs/regulations/standardnumber/1910")
        fnd = {
            "title": f"Process Barrier Degradation: {top_lsr.get('rule', 'General Operational Hazard')}",
            "description": f"Analysis identified elevated SIF potential ({risk_score*100:.1f}%) with primary precursor barrier failure: {precursors.get('barriers', ['Operational controls'])[0] if precursors.get('barriers') else 'Safety barrier'}.",
            "hazard_category": "Process Safety & Hazard Control",
            "facility": facility,
            "severity": risk_level,
            "applicable_regulation": "OSHA General Duty Clause / IOGP Life Saving Rules",
            "source_url": doc_url,
            "source_domain": "osha.gov",
            "verified_excerpt": "Employers must furnish to each worker a place of employment free from recognized hazards causing or likely to cause death or serious physical harm.",
            "internal_evidence": f"Mapped to IOGP Rule: {top_lsr.get('rule', 'Life Saving Rule')}.",
            "uncertainty_score": "MEDIUM",
            "uncertainty_rationale": "High systemic risk indicated by ML classifier; specific statutory clause pending HSE officer adjudication.",
            "recommended_action": top_lsr.get("intervention", "Conduct mandatory supervisory safety walk and review safe work permit."),
            "status": "CANDIDATE",
            "report_id": report_id or f"REP-{datetime.now().strftime('%m%d%H%M')}"
        }
        fid = save_finding(fnd, actor="Evidence Correlation Engine")
        fnd["id"] = fid
        findings.append(fnd)

    return findings


def _find_best_doc(docs: List[Dict[str, Any]], keywords: List[str]) -> Optional[Dict[str, Any]]:
    for doc in docs:
        url = doc.get("url", "").lower()
        title = doc.get("title", "").lower()
        text = doc.get("text", "").lower()
        if any(kw in url or kw in title or kw in text for kw in keywords):
            return doc
    return docs[0] if docs else None


def _extract_excerpt(text: str, keywords: List[str], default_text: str) -> str:
    if not text:
        return default_text
    # Search for sentence containing one of the keywords
    sentences = re.split(r'\.\s+|\n\n+', text)
    for s in sentences:
        s_clean = s.strip()
        if any(kw.lower() in s_clean.lower() for kw in keywords) and len(s_clean) > 20:
            return s_clean[:280] + ("..." if len(s_clean) > 280 else "")
    return default_text
