"""
End-to-end verification of the exact V-102 demonstration scenario:
"Worker entered separator vessel V-102 at Pump Station 4 for sludge removal without conducting mandatory atmospheric gas testing for H2S and O2 levels. No standby person was present at the manhole."
"""
import os
import sys
import unittest
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.analysis import analyze_report
from ai.hitl import record_review, get_reviews

class TestV102EndToEnd(unittest.TestCase):
    def test_v102_complete_pipeline(self):
        v102_report = (
            "Worker entered separator vessel V-102 at Pump Station 4 for sludge removal "
            "without conducting mandatory atmospheric gas testing for H2S and O2 levels. "
            "No standby person was present at the manhole."
        )

        print("\n--- Running V-102 End-to-End Analysis ---")
        result = analyze_report(v102_report)

        # 1. SIF Risk Score & Classification
        self.assertIn('risk_score', result)
        self.assertIn('sif_potential', result)
        self.assertTrue(result['sif_potential'], "V-102 scenario must be flagged as SIF Potential")
        print(f"SIF Potential: {result['sif_potential']}, SIF Risk Score: {result['risk_score']}")

        # 2. Precursor & Entity Extraction
        precursors = result.get('precursors', {})
        activity = precursors.get('activity', [])
        location = precursors.get('location', [])
        equipment = precursors.get('equipment', [])
        hazards = precursors.get('hazards', [])
        barrier_failures = precursors.get('barrier_failure', [])
        consequences = precursors.get('consequences', [])

        print(f"Extracted Activity: {activity}")
        print(f"Extracted Location: {location}")
        print(f"Extracted Equipment: {equipment}")
        print(f"Extracted Hazards: {hazards}")
        print(f"Extracted Barrier Failures: {barrier_failures}")
        print(f"Extracted Consequences: {consequences}")

        self.assertTrue('sludge' in str(activity).lower() or 'removal' in str(activity).lower() or 'cleaning' in str(activity).lower(),
                        f"Expected sludge removal in activity, got: {activity}")
        self.assertTrue('pump station 4' in str(location).lower() or 'v-102' in str(location).lower(),
                        f"Expected Pump Station 4 or V-102 in location, got: {location}")
        self.assertTrue(any('h2s' in h.lower() or 'oxygen' in h.lower() for h in hazards),
                        f"Expected H2S or oxygen deficiency in hazards, got: {hazards}")
        self.assertTrue(any('atmospheric' in b.lower() or 'standby' in b.lower() for b in barrier_failures),
                        f"Expected atmospheric testing or standby failure, got: {barrier_failures}")
        self.assertTrue(any('toxic' in c.lower() or 'asphyxiation' in c.lower() or 'fatality' in c.lower() for c in consequences),
                        f"Expected toxic/asphyxiation/fatality consequence, got: {consequences}")

        # 3. Applicable Life-Saving Rule
        lsr = result.get('lsr', {})
        print(f"Applicable LSR: {lsr.get('rule')} (Score: {lsr.get('score')}, Match Strength: {lsr.get('match_strength')})")
        self.assertEqual(lsr.get('rule'), "Confined Space Entry", "Applicable LSR must be Confined Space Entry")
        self.assertGreaterEqual(lsr.get('score', 0), 0.7)

        # 4. RAG Evidence
        evidence = result.get('evidence', [])
        print(f"RAG Retrieved {len(evidence)} evidence citations:")
        for ev in evidence:
            print(f"  - [{ev.get('source')}] Section: {ev.get('section')}")
        self.assertGreater(len(evidence), 0, "RAG pipeline must retrieve real citations")

        # 5. Grounded Explanation & Recommendations
        explanation = result.get('explanation', '')
        recommendation = result.get('recommendation', '')
        print(f"\nGrounded Explanation:\n{explanation}")
        print(f"\nAction Recommendation:\n{recommendation}")
        self.assertTrue(len(explanation) > 50, "Expected detailed grounded explanation")
        self.assertTrue(len(recommendation) > 20, "Expected safety recommendations")

        # 6. Similar Patterns
        patterns = result.get('similar_patterns', [])
        print(f"\nSimilar Precursor Patterns: {len(patterns)} found")
        self.assertGreater(len(patterns), 0, "Expected similar precursor pattern clusters")

        # 7. HITL Review Flow
        print("\n--- Testing HITL Review Audit Flow ---")
        review_entry = record_review(
            report_id="V102-TEST-001",
            action="CONFIRM",
            reviewer="Lead HSE Safety Officer",
            notes="HSE verified Confined Space Life-Saving Rule breach at V-102 Pump Station 4",
            adjusted_sif=True
        )
        self.assertEqual(review_entry.get('action'), "CONFIRM")
        self.assertEqual(review_entry.get('status'), "HSE-Confirmed SIF Precursor")

        # Check retrieval from reviews
        all_reviews = get_reviews()
        found = any(r.get('report_id') == "V102-TEST-001" and r.get('action') == "CONFIRM" for r in all_reviews)
        self.assertTrue(found, "Review must be persisted and retrievable")
        print("HITL Review successfully recorded and verified as HSE-Confirmed SIF Precursor.")

if __name__ == '__main__':
    unittest.main()
