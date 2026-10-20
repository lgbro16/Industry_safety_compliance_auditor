"""
test_auditor_backend.py - Unit and Integration Tests for Compliance Auditor
Tests:
- Database schema & persistence
- SSRF prevention & URL allowlist
- TinyFish Search & Fetch pipeline
- Certificate metadata extraction & alert synthesis
- Evidence correlation & candidate findings generation
- Human review workflow & audit trail logging
"""

import os
import sys
import unittest

# Ensure Backend/SIH26165_ML is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from ai.storage import (
    init_db,
    get_all_certificates,
    add_certificate,
    get_all_findings,
    save_finding,
    review_finding,
    get_regulatory_documents,
    get_audit_trail
)
from ai.tinyfish_client import (
    is_safe_regulatory_url,
    get_tinyfish_status,
    search_tinyfish,
    fetch_tinyfish
)
from ai.certificate_manager import (
    extract_metadata_from_text,
    get_certificate_alerts,
    compute_certificate_status
)
from ai.regulatory_discovery import evaluate_research_trigger
from ai.evidence_correlation import correlate_and_generate_findings


class TestComplianceAuditorBackend(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()

    def test_01_ssrf_protection(self):
        """Verify that private IPs, localhost, and non-whitelisted domains are handled safely."""
        # Loopback rejection
        safe, reason = is_safe_regulatory_url("http://127.0.0.1:8080/admin")
        self.assertFalse(safe)
        self.assertIn("prohibited", reason.lower())

        # Cloud metadata service rejection
        safe, _ = is_safe_regulatory_url("http://169.254.169.254/latest/meta-data/")
        self.assertFalse(safe)

        # Private RFC 1918 range rejection
        safe, _ = is_safe_regulatory_url("http://192.168.1.1/router")
        self.assertFalse(safe)

        # Valid approved domain accepted
        safe, _ = is_safe_regulatory_url("https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146", enforce_allowlist=True)
        self.assertTrue(safe)

    def test_02_tinyfish_status(self):
        """Verify TinyFish configuration reporting."""
        status = get_tinyfish_status()
        self.assertIn("enabled", status)
        self.assertIn("mode", status)
        self.assertIn("approved_domains", status)

    def test_03_tinyfish_search_and_fetch(self):
        """Verify Search and Fetch responses and data format."""
        # Search
        search_res = search_tinyfish(query="permit required confined space atmospheric testing")
        self.assertEqual(search_res["status"], "SUCCESS")
        self.assertGreater(len(search_res["results"]), 0)
        self.assertIn("url", search_res["results"][0])

        # Fetch
        target_url = search_res["results"][0]["url"]
        fetch_res = fetch_tinyfish(urls=[target_url])
        self.assertEqual(fetch_res["status"], "SUCCESS")
        self.assertGreater(len(fetch_res["results"]), 0)
        self.assertTrue(len(fetch_res["results"][0]["text"]) > 50)
        self.assertTrue(len(fetch_res["results"][0].get("content_hash", "")) > 10)

    def test_04_certificate_manager(self):
        """Verify certificate extraction, expiry computation, and alerts."""
        meta = extract_metadata_from_text(
            "Certificate for vessel V-102 hydrostatic proof test issued 2023-01-01 expires 2024-01-01 by Bureau Veritas.",
            filename="PV-HYD-99881.pdf"
        )
        self.assertEqual(meta["equipment_id"], "V-102")
        self.assertEqual(meta["status"], "EXPIRED")

        alerts = get_certificate_alerts()
        self.assertIn("summary", alerts)
        self.assertGreater(alerts["summary"]["total_certificates"], 0)
        self.assertIn("tinyagent_sync", alerts)

    def test_05_evidence_correlation(self):
        """Verify requirement-to-evidence correlation and candidate findings generation."""
        report = "Worker entered crude separator V-102 without conducting multi-gas atmospheric testing. No attendant present."
        precursors = {
            "activity": "Vessel entry and sludge cleaning",
            "hazards": ["Confined Space Entry", "Toxic Hydrocarbon Gas"],
            "barriers": ["Atmospheric Testing", "Confined Space Entry Permit"]
        }
        top_lsr = {"rule": "Confined Space Entry", "score": 0.92, "match_strength": "HIGH"}

        fetched_docs = [{
            "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146",
            "title": "OSHA 1910.146 - Permit-Required Confined Spaces",
            "text": "Before an employee enters the space, the internal atmosphere shall be tested with a calibrated direct-reading instrument for oxygen and toxic gases."
        }]

        findings = correlate_and_generate_findings(
            report_text=report,
            risk_level="CRITICAL",
            risk_score=0.88,
            precursors=precursors,
            top_lsr=top_lsr,
            internal_evidence=[],
            fetched_docs=fetched_docs,
            facility="Digboi Tank Farm"
        )

        self.assertGreater(len(findings), 0)
        top_finding = findings[0]
        self.assertEqual(top_finding["status"], "CANDIDATE")
        self.assertIn("1910.146", top_finding["applicable_regulation"])
        self.assertIn("calibrated", top_finding["verified_excerpt"].lower())

    def test_06_human_review_and_audit(self):
        """Verify that human reviews change status and record audit events."""
        fnd = {
            "title": "Test Scafftag Deficiency",
            "description": "Scaffold missing guardrails at pipe rack",
            "hazard_category": "Fall from Height",
            "facility": "Drilling Rig 04",
            "severity": "HIGH",
            "applicable_regulation": "OSHA 1926.451",
            "status": "CANDIDATE",
            "uncertainty_score": "LOW"
        }
        fid = save_finding(fnd)

        # Adjudicate finding
        res = review_finding(
            finding_id=fid,
            decision="CONFIRM",
            reviewer="Chief Safety Auditor P. Sharma",
            comments="Inspected on rig floor; verified non-compliant guardrail."
        )
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["finding"]["status"], "CONFIRMED")

        # Verify audit trail contains the event
        trail = get_audit_trail(limit=5)
        self.assertGreater(len(trail), 0)
        review_events = [e for e in trail if e["event_type"] == "FINDING_REVIEWED"]
        self.assertGreater(len(review_events), 0)


if __name__ == "__main__":
    unittest.main()
