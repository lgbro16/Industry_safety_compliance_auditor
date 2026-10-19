"""
regulatory_discovery.py - Regulatory Intelligence & Evidence Discovery Engine
Coordinates:
- Trigger evaluation (deciding when external research is necessary)
- Targeted search query synthesis from incident reports
- TinyFish Search & Fetch pipeline execution
- Document hash calculation, versioning, and update detection
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from ai.tinyfish_client import (
    search_tinyfish,
    fetch_tinyfish,
    APPROVED_REGULATORY_DOMAINS,
    get_tinyfish_status
)
from ai.storage import get_regulatory_documents, log_audit_event


def evaluate_research_trigger(
    risk_level: str,
    risk_score: float,
    precursors: Dict[str, Any],
    internal_evidence_count: int,
    force_research: bool = False
) -> Tuple[bool, str]:
    """
    Determines whether external regulatory research should be triggered.
    Trigger conditions:
    1. User explicitly enabled external research
    2. High or Critical SIF risk level (score >= 0.60)
    3. Severe hazard categories (Confined space, toxic gas, electrical isolation, fall from height, lifting)
    4. Sparse internal evidence (fewer than 2 relevant internal RAG chunks)
    """
    if force_research:
        return True, "Triggered by explicit operator request."

    if risk_level in ("CRITICAL", "HIGH") or risk_score >= 0.60:
        return True, f"Triggered by elevated SIF risk assessment (Risk Level: {risk_level}, Score: {risk_score:.2f})."

    # Check for critical keywords in precursors
    hazards = [str(h).lower() for h in precursors.get("hazards", [])]
    activity = str(precursors.get("activity", "")).lower()
    critical_terms = ["confined", "h2s", "gas", "isolation", "loto", "height", "scaffold", "crane", "pressure", "hydrostatic"]

    for term in critical_terms:
        if any(term in h for h in hazards) or term in activity:
            return True, f"Triggered by high-consequence process hazard keyword '{term}'."

    if internal_evidence_count < 2:
        return True, "Triggered due to sparse internal evidence base (requires external statutory grounding)."

    return False, "External research not required based on baseline threshold criteria."


def synthesize_regulatory_queries(report_text: str, precursors: Dict[str, Any]) -> List[str]:
    """
    Synthesizes targeted regulatory search queries from incident text and extracted precursors.
    """
    queries = []
    activity = precursors.get("activity", "")
    hazards = precursors.get("hazards", [])
    barriers = precursors.get("barriers", [])

    # Primary query combining activity and hazard
    if activity and hazards:
        queries.append(f"{activity} {hazards[0]} safety regulation standard requirements")

    # Domain specific queries
    text_lower = report_text.lower()
    if "confined" in text_lower or "vessel entry" in text_lower or "tank" in text_lower:
        queries.append("permit required confined space atmospheric testing standards osha dgms")
    elif "lockout" in text_lower or "tagout" in text_lower or "isolation" in text_lower or "breaker" in text_lower:
        queries.append("hazardous energy control lockout tagout verification standards osha")
    elif "scaffold" in text_lower or "height" in text_lower or "fall" in text_lower:
        queries.append("scaffolding inspection fall protection requirements osha 1926")
    elif "crane" in text_lower or "lifting" in text_lower or "rigging" in text_lower:
        queries.append("crane periodic load test wire rope inspection standard osha dgms")
    elif "pressure" in text_lower or "hydrostatic" in text_lower or "separator" in text_lower:
        queries.append("unfired pressure vessel statutory hydrostatic test frequency dgms asme")
    elif "hot work" in text_lower or "welding" in text_lower or "spark" in text_lower:
        queries.append("hot work permit combustible atmosphere gas test nfpa 51b osha")

    # Fallback generic query
    if not queries:
        first_sentence = report_text.split(".")[0][:80]
        queries.append(f"{first_sentence} industrial safety compliance requirement")

    return queries[:2]


def execute_regulatory_research(
    query_or_report: str,
    precursors: Optional[Dict[str, Any]] = None,
    preferred_domains: Optional[List[str]] = None,
    max_fetch_urls: int = 2
) -> Dict[str, Any]:
    """
    Complete Search -> Fetch -> Evidence pipeline:
    1. Synthesizes search query
    2. Calls TinyFish Search API
    3. Selects top relevant URLs from approved domains
    4. Calls TinyFish Fetch API to retrieve clean markdown
    5. Returns structured external regulatory findings
    """
    if precursors:
        queries = synthesize_regulatory_queries(query_or_report, precursors)
        search_query = queries[0]
    else:
        search_query = query_or_report

    # Step 1: TinyFish Search
    search_resp = search_tinyfish(
        query=search_query,
        purpose="Retrieve official regulatory clauses, permissible limits, and statutory inspection mandates",
        include_domains=preferred_domains or APPROVED_REGULATORY_DOMAINS
    )

    results = search_resp.get("results", [])
    if not results:
        return {
            "query": search_query,
            "search_status": "EMPTY",
            "mode": search_resp.get("mode"),
            "fetched_documents": [],
            "message": "No regulatory documents found matching query."
        }

    # Step 2: Select URLs to Fetch (priority to approved official domains)
    candidate_urls = [r["url"] for r in results if r.get("url")]
    target_urls = candidate_urls[:max_fetch_urls]

    # Step 3: TinyFish Fetch
    fetch_resp = fetch_tinyfish(
        urls=target_urls,
        purpose=f"Extract statutory compliance clauses for: {search_query}"
    )

    fetched_docs = fetch_resp.get("results", [])

    return {
        "query": search_query,
        "search_status": "SUCCESS",
        "mode": fetch_resp.get("mode", search_resp.get("mode")),
        "search_results_count": len(results),
        "search_results": results,
        "fetched_documents": fetched_docs,
        "errors": fetch_resp.get("errors", []),
        "notice": fetch_resp.get("notice")
    }
