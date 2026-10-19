"""
test_api.py - SIF-GUARD API Contract Test Suite
Tests all endpoints and measures RSS memory at each stage.
Run AFTER starting the server: python test_api.py

Usage:
  python test_api.py [--url http://localhost:5000]
"""

import sys
import os
import json
import time
import argparse
import psutil

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    sys.exit(1)

BASE_URL = "http://localhost:5000"

V102_TEXT = (
    "Worker entered separator vessel V-102 at Pump Station 4 for sludge removal "
    "without conducting mandatory atmospheric gas testing for H2S and O2 levels. "
    "No standby person was present at the manhole."
)

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"


def rss_mb():
    return psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)


def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    suffix = f" ({detail})" if detail else ""
    print(f"  {status} {label}{suffix}")
    return condition


def test_root(base):
    print("\n[1] GET /")
    r = requests.get(f"{base}/", timeout=10)
    ok = r.status_code == 200
    check("Status 200", ok, r.status_code)
    if ok:
        data = r.json()
        check("status=HEALTHY", data.get("status") == "HEALTHY")
    return ok


def test_health(base):
    print("\n[2] GET /api/health")
    r = requests.get(f"{base}/api/health", timeout=10)
    ok = r.status_code == 200
    check("Status 200", ok, r.status_code)
    if ok:
        data = r.json()
        check("status=HEALTHY", data.get("status") == "HEALTHY")
        check("product field present", "product" in data)
        check("embedding_model field present", "embedding_model" in data)
        print(f"  {INFO} embedding_model = {data.get('embedding_model')}")
        print(f"  {INFO} llm_model = {data.get('llm_model')}")
        print(f"  {INFO} rag_retrieval_mode = {data.get('rag_retrieval_mode')}")
    return ok


def test_analyze(base):
    print("\n[3] POST /api/analyze (V-102 confined space test)")
    r = requests.post(
        f"{base}/api/analyze",
        json={"text": V102_TEXT},
        timeout=90
    )
    ok = r.status_code == 200
    check("Status 200", ok, r.status_code)
    if not ok:
        print(f"  Response: {r.text[:300]}")
        return False

    data = r.json()
    checks_passed = True

    # SIF classification
    checks_passed &= check("risk_score present", "risk_score" in data)
    checks_passed &= check("risk_level present", "risk_level" in data)
    checks_passed &= check("sif_potential present", "sif_potential" in data)
    sif = data.get("sif_potential", False)
    checks_passed &= check("SIF potential = True (confined space)", sif is True, str(sif))

    # Risk score >= 50 (HIGH or CRITICAL)
    score = data.get("risk_score", 0)
    checks_passed &= check(f"Risk score >= 50 (got {score})", score >= 50)

    # LSR
    lsr = data.get("lsr", {})
    rule = lsr.get("rule", "")
    checks_passed &= check("LSR rule identified", bool(rule), rule)
    confined = "confined space" in rule.lower()
    checks_passed &= check("LSR = Confined Space Entry", confined, rule)

    # Extraction
    precursors = data.get("precursors", {})
    hazards = precursors.get("hazards", [])
    barriers = precursors.get("barrier_failures", [])
    h2s = any("h2s" in h.lower() or "hydrogen sulfide" in h.lower() or "h2s" in h.lower() for h in hazards)
    o2 = any("oxygen" in h.lower() for h in hazards)
    atm_barrier = any("atmospheric" in b.lower() or "gas test" in b.lower() for b in barriers)
    standby_barrier = any("standby" in b.lower() for b in barriers)

    checks_passed &= check("H2S hazard identified", h2s, str(hazards))
    checks_passed &= check("Oxygen deficiency hazard identified", o2, str(hazards))
    checks_passed &= check("No atmospheric testing barrier identified", atm_barrier, str(barriers))
    checks_passed &= check("No standby person barrier identified", standby_barrier, str(barriers))

    # RAG evidence
    evidence = data.get("evidence", [])
    checks_passed &= check("RAG evidence present", len(evidence) > 0 and evidence[0].get("score", 0) > 0, str(len(evidence)))

    # Explanation
    checks_passed &= check("explanation field present", bool(data.get("explanation")))
    checks_passed &= check("recommendation field present", bool(data.get("recommendation")))

    print(f"\n  V-102 Summary:")
    print(f"    risk_level    = {data.get('risk_level')} ({score})")
    print(f"    lsr.rule      = {rule}")
    print(f"    lsr.strength  = {lsr.get('match_strength')}")
    print(f"    barriers      = {barriers}")
    print(f"    hazards       = {hazards}")
    print(f"    evidence[0]   = {evidence[0].get('source')} | {evidence[0].get('section')} (score={evidence[0].get('score')})")
    print(f"    retrieval     = {evidence[0].get('retrieval_mode')}")

    return checks_passed


def test_analytics(base):
    print("\n[4] GET /api/analytics")
    r = requests.get(f"{base}/api/analytics", timeout=30)
    ok = r.status_code == 200
    check("Status 200", ok, r.status_code)
    if ok:
        data = r.json()
        check("total_reports present", "total_reports" in data)
        check("sif_precursors present", "sif_precursors" in data)
        print(f"  {INFO} total_reports = {data.get('total_reports')}")
        print(f"  {INFO} sif_precursors = {data.get('sif_precursors')}")
    return ok


def test_patterns(base):
    print("\n[5] GET /api/patterns")
    r = requests.get(f"{base}/api/patterns", timeout=120)
    ok = r.status_code == 200
    check("Status 200", ok, r.status_code)
    if ok:
        data = r.json()
        clusters = data.get("clusters", [])
        check("clusters present", len(clusters) > 0, str(len(clusters)))
        if clusters:
            c = clusters[0]
            check("cluster has title", bool(c.get("title")))
            check("cluster has sif_proportion", "sif_proportion" in c)
    return ok


def test_reviews_get(base):
    print("\n[6] GET /api/reviews")
    r = requests.get(f"{base}/api/reviews", timeout=10)
    ok = r.status_code == 200
    check("Status 200", ok, r.status_code)
    if ok:
        data = r.json()
        check("reviews field present", "reviews" in data)
        check("total field present", "total" in data)
    return ok


def test_reviews_post(base):
    print("\n[7] POST /api/reviews")
    payload = {
        "report_id": "TEST-V102-001",
        "decision": "CONFIRM",
        "comment": "Confirmed confined space violation — atmospheric test mandatory.",
        "reviewer": "Lead HSE Officer"
    }
    r = requests.post(f"{base}/api/reviews", json=payload, timeout=10)
    ok = r.status_code == 201
    check("Status 201", ok, r.status_code)
    if ok:
        data = r.json()
        check("status=SUCCESS", data.get("status") == "SUCCESS")
    return ok


def test_jobs(base):
    print("\n[8] POST /api/jobs + GET /api/jobs/<id>")
    payload = {"reports": [{"report_id": "JOB-TEST-001", "text": V102_TEXT}]}
    r = requests.post(f"{base}/api/jobs", json=payload, timeout=15)
    ok = r.status_code == 202
    check("Status 202", ok, r.status_code)
    if ok:
        data = r.json()
        job_id = data.get("job_id")
        check("job_id present", bool(job_id))
        # Poll status
        time.sleep(5)
        r2 = requests.get(f"{base}/api/jobs/{job_id}", timeout=10)
        ok2 = r2.status_code == 200
        check("GET /api/jobs/<id> status 200", ok2, r2.status_code)
        if ok2:
            j = r2.json()
            check("progress field present", "progress" in j)
    return ok


def run_all(base):
    print("=" * 60)
    print("  SIF-GUARD API INTEGRATION TEST SUITE")
    print("=" * 60)
    print(f"  Target: {base}")
    print(f"  RSS at test start: {rss_mb():.1f} MB")

    results = {}
    results["root"] = test_root(base)

    rss_health_before = rss_mb()
    results["health"] = test_health(base)
    rss_health_after = rss_mb()
    print(f"  {INFO} RSS after /api/health: {rss_health_after:.1f} MB")

    rss_analyze_before = rss_mb()
    results["analyze"] = test_analyze(base)
    rss_analyze_after = rss_mb()
    print(f"\n  {INFO} RSS after /api/analyze: {rss_analyze_after:.1f} MB")

    results["analytics"] = test_analytics(base)

    rss_patterns_before = rss_mb()
    results["patterns"] = test_patterns(base)
    rss_patterns_after = rss_mb()
    print(f"\n  {INFO} RSS after /api/patterns: {rss_patterns_after:.1f} MB")

    results["reviews_get"] = test_reviews_get(base)
    results["reviews_post"] = test_reviews_post(base)
    results["jobs"] = test_jobs(base)

    print("\n" + "=" * 60)
    print("  TEST RESULTS SUMMARY")
    print("=" * 60)
    all_pass = True
    for name, passed in results.items():
        status = PASS if passed else FAIL
        print(f"  {status} {name}")
        if not passed:
            all_pass = False

    print(f"\n  RSS measurements (client-side, approximate):")
    print(f"    After /api/health:   {rss_health_after:.1f} MB")
    print(f"    After /api/analyze:  {rss_analyze_after:.1f} MB")
    print(f"    After /api/patterns: {rss_patterns_after:.1f} MB")
    print(f"\n  Overall: {'ALL TESTS PASSED' if all_pass else 'SOME TESTS FAILED'}")
    print("=" * 60)
    return all_pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=BASE_URL)
    args = parser.parse_args()

    # Wait for server to be ready
    print(f"Waiting for server at {args.url}...")
    for attempt in range(30):
        try:
            r = requests.get(f"{args.url}/", timeout=3)
            if r.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(2)
    else:
        print("Server not available after 60s. Is it running?")
        sys.exit(1)

    success = run_all(args.url)
    sys.exit(0 if success else 1)
