"""
test_pipeline.py - Automated Unit & Integration Tests for SIF-GUARD
Tests preprocessing, classifier, extraction, LSR matching, RAG retrieval,
graceful degradation, and the V-102 end-to-end demo scenario.
"""

import os
import sys
import unittest

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from ai.preprocessing import preprocess, expand_abbreviations, SAFETY_PRESERVE_WORDS
from ai.classifier import predict_sif_risk
from ai.extraction import extract_factors
from ai.lsr import match_life_saving_rules
from ai.rag import retrieve_context, get_relevant_safety_evidence, build_index
from ai.analysis import analyze_full_pipeline
from ai.llm import generate_grounded_explanation


class TestSIFGuardPipeline(unittest.TestCase):

    def setUp(self):
        self.v102_report = (
            "Worker entered separator vessel V-102 at Pump Station 4 for sludge removal "
            "without conducting mandatory atmospheric gas testing for H2S and O2 levels. "
            "No standby person was present at the manhole."
        )
        self.nonsif_report = (
            "Housekeeping not maintained near the canteen area. Waste bins are overflowing. "
            "Minor slip hazard observed due to water spillage near entrance. Area marked with wet floor sign."
        )

    # ── 1. PREPROCESSING TESTS ──
    def test_abbreviation_expansion(self):
        text = "Worker entered tank without PTW or LOTO. Found high H2S."
        expanded = expand_abbreviations(text)
        self.assertIn("permit to work", expanded)
        self.assertIn("lockout tagout energy isolation", expanded)
        self.assertIn("hydrogen sulfide toxic gas", expanded)

    def test_safety_negation_preservation(self):
        text = "Technician entered without harness. Standby was absent and valve not isolated."
        processed = preprocess(text)
        self.assertIn("without", processed)
        self.assertIn("absent", processed)
        self.assertIn("not", processed)

    # ── 2. EXTRACTION TESTS ──
    def test_v102_extraction(self):
        factors = extract_factors(self.v102_report)
        self.assertEqual(factors["activity"], "Sludge removal")
        self.assertIn("Pump Station 4", factors["location"])
        self.assertIn("H2S exposure", factors["hazards"])
        self.assertIn("Oxygen deficiency", factors["hazards"])
        self.assertIn("No atmospheric testing", factors["barrier_failures"])
        self.assertIn("No standby person", factors["barrier_failures"])
        self.assertTrue(any("Toxic exposure" in c for c in factors["potential_consequences"]))
        self.assertTrue(any("Asphyxiation" in c for c in factors["potential_consequences"]))

    # ── 3. LSR MATCHING TESTS ──
    def test_lsr_matching(self):
        matches = match_life_saving_rules(self.v102_report)
        self.assertTrue(len(matches) > 0)
        top_rule = matches[0]
        self.assertEqual(top_rule["rule"], "Confined Space Entry")
        self.assertIn(top_rule["match_strength"], ["HIGH", "CRITICAL"])
        self.assertGreaterEqual(top_rule["score"], 0.5)

    # ── 4. CLASSIFIER TESTS ──
    def test_classifier_sif_detection(self):
        res = predict_sif_risk(self.v102_report)
        self.assertTrue(res["sif_potential"])
        self.assertGreaterEqual(res["risk_score"], 50.0)
        self.assertIn(res["risk_level"], ["CRITICAL", "HIGH"])
        self.assertEqual(res["model_name"], "Baseline Hybrid NLP Classifier")

    def test_classifier_nonsif_detection(self):
        res = predict_sif_risk(self.nonsif_report)
        self.assertLess(res["risk_score"], 50.0)
        self.assertIn(res["risk_level"], ["LOW", "MEDIUM"])

    # ── 5. RAG RETRIEVAL TESTS ──
    def test_rag_retrieval_genuine_evidence(self):
        build_index()
        evidence = get_relevant_safety_evidence(self.v102_report, top_k=3)
        self.assertTrue(len(evidence) > 0)
        for ev in evidence:
            self.assertIn("source", ev)
            self.assertIn("section", ev)
            self.assertIn("text", ev)
            # Verify source matches authentic documents in knowledge_base
            self.assertTrue(any(src in ev["source"] for src in ["Iogp", "Oisd", "H2S", "Separator", "Report 459"]))

    # ── 6. GRACEFUL DEGRADATION & ERROR HANDLING ──
    def test_empty_report_handling(self):
        with self.assertRaises(ValueError):
            analyze_full_pipeline("")

    def test_offline_llm_fallback(self):
        # Even without Gemini API key, explanation must be produced
        precursors = extract_factors(self.v102_report)
        evidence = get_relevant_safety_evidence(self.v102_report, top_k=2)
        llm_out = generate_grounded_explanation(
            report_text=self.v102_report,
            risk_level="CRITICAL",
            risk_score=88.0,
            rule="Confined Space Entry",
            precursors=precursors,
            evidence=evidence
        )
        self.assertIn("explanation", llm_out)
        self.assertIn("recommendation", llm_out)
        self.assertTrue(len(llm_out["explanation"]) > 20)

    # ── 7. FULL MASTER PIPELINE TEST (V-102 DEMO) ──
    def test_full_v102_pipeline_contract(self):
        output = analyze_full_pipeline(self.v102_report)

        # Check required contract keys
        self.assertIn("risk_score", output)
        self.assertIn("risk_level", output)
        self.assertIn("sif_potential", output)
        self.assertIn("model", output)
        self.assertIn("precursors", output)
        self.assertIn("lsr", output)
        self.assertIn("explanation", output)
        self.assertIn("evidence", output)
        self.assertIn("recommendation", output)

        # Check values
        self.assertTrue(output["sif_potential"])
        self.assertEqual(output["precursors"]["activity"], "Sludge removal")
        self.assertEqual(output["lsr"]["rule"], "Confined Space Entry")
        self.assertTrue(len(output["evidence"]) > 0)


if __name__ == "__main__":
    unittest.main()
