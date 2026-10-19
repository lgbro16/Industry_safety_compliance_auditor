"""
investigation_orchestrator.py - Master Safety Compliance Investigation Orchestrator
Bridges:
- SIF-Guard ML Risk Classification & Extraction
- Internal Authoritative Safety RAG (IOGP Life-Saving Rules)
- TinyFish Autonomous Regulatory Search & Fetch Engine
- Requirement-to-Evidence Correlation & Candidate Findings Generation
- Traceable Provenance & Persistent Audit Trail
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from ai.analysis import analyze_full_pipeline
from ai.regulatory_discovery import (
    evaluate_research_trigger,
    execute_regulatory_research
)
from ai.evidence_correlation import correlate_and_generate_findings
from ai.storage import log_audit_event
from ai.tinyfish_client import get_tinyfish_status


def run_compliance_investigation(
    report_text: str,
    facility: str = "Digboi Central Operations",
    force_research: bool = False,
    actor: str = "HSE Compliance Investigator"
) -> Dict[str, Any]:
    """
    Executes an end-to-end industrial safety compliance audit on an observation or incident report.
    """
    if not report_text or not report_text.strip():
        raise ValueError("Safety report text is required.")

    # 1. Run internal SIF-Guard pipeline (Classifier, Extractors, LSR, Internal RAG, LLM)
    base_analysis = analyze_full_pipeline(report_text)

    risk_level = base_analysis.get("risk_level", "MEDIUM")
    risk_score = base_analysis.get("risk_score", 0.50)
    precursors = base_analysis.get("precursors", {})
    top_lsr = base_analysis.get("lsr", {})
    internal_evidence = base_analysis.get("evidence", [])

    # 2. Evaluate External Research Trigger Condition
    should_research, trigger_reason = evaluate_research_trigger(
        risk_level=risk_level,
        risk_score=risk_score,
        precursors=precursors,
        internal_evidence_count=len(internal_evidence),
        force_research=force_research
    )

    external_research_result = None
    fetched_docs = []
    candidate_findings = []

    if should_research:
        # 3. Autonomous TinyFish Search & Fetch
        external_research_result = execute_regulatory_research(
            query_or_report=report_text,
            precursors=precursors,
            max_fetch_urls=2
        )
        fetched_docs = external_research_result.get("fetched_documents", [])

        # 4. Correlate Evidence and Generate Candidate Findings
        candidate_findings = correlate_and_generate_findings(
            report_text=report_text,
            risk_level=risk_level,
            risk_score=risk_score,
            precursors=precursors,
            top_lsr=top_lsr,
            internal_evidence=internal_evidence,
            fetched_docs=fetched_docs,
            facility=facility
        )

    # 5. Log Investigation Audit Record
    log_audit_event("INVESTIGATION_RUN", actor, "REPORT", None, {
        "facility": facility,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "external_research_triggered": should_research,
        "trigger_reason": trigger_reason,
        "findings_generated": len(candidate_findings)
    })

    return {
        "status": "SUCCESS",
        "investigation_timestamp": datetime.now(timezone.utc).isoformat(),
        "facility": facility,
        "report_text": report_text,

        # Internal SIF Assessment
        "risk_level": risk_level,
        "risk_score": risk_score,
        "risk_color": base_analysis.get("risk_color", "#ea580c"),
        "sif_potential": base_analysis.get("sif_potential", "POTENTIAL SIF"),
        "action": base_analysis.get("action", "Initiate Investigation"),
        "precursors": precursors,
        "lsr": top_lsr,
        "internal_evidence": internal_evidence,
        "explanation": base_analysis.get("explanation"),
        "recommendation": base_analysis.get("recommendation"),
        "similar_patterns": base_analysis.get("similar_patterns", []),
        "model_metadata": base_analysis.get("model", {}),

        # External Regulatory Research (TinyFish)
        "external_research": {
            "triggered": should_research,
            "trigger_reason": trigger_reason,
            "tinyfish_status": get_tinyfish_status(),
            "query": external_research_result.get("query") if external_research_result else None,
            "mode": external_research_result.get("mode") if external_research_result else None,
            "search_results": external_research_result.get("search_results", []) if external_research_result else [],
            "fetched_documents": fetched_docs,
            "notice": external_research_result.get("notice") if external_research_result else None
        },

        # Correlated Candidate Findings
        "candidate_findings": candidate_findings,

        # Legal & Governance Disclaimers
        "disclaimer": "AI provides decision support and does not independently certify legal compliance or site safety. All findings require qualification and adjudication by designated HSE personnel."
    }
