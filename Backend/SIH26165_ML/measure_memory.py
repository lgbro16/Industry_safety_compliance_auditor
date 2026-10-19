"""
measure_memory.py - RSS Memory measurement for SIF-GUARD backend
Run this BEFORE and AFTER optimizations to measure actual process memory.
"""

import os
import sys
import time
import psutil

def get_rss_mb():
    """Return current process RSS in MB."""
    proc = psutil.Process(os.getpid())
    return proc.memory_info().rss / (1024 * 1024)


def measure_point(label: str):
    rss = get_rss_mb()
    print(f"[MEMORY] {label}: {rss:.1f} MB RSS", flush=True)
    return rss


if __name__ == "__main__":
    # Baseline - just Python
    measure_point("Python baseline (before imports)")

    # Import flask + dotenv (lightweight)
    from dotenv import load_dotenv
    load_dotenv()
    measure_point("After dotenv/flask imports")

    # Import AI modules (this is where memory jumps)
    sys.path.insert(0, os.path.dirname(__file__))

    print("\n--- Importing AI modules ---")
    import ai.preprocessing
    measure_point("After preprocessing import")

    import ai.classifier
    measure_point("After classifier import")

    import ai.extraction
    measure_point("After extraction import")

    import ai.lsr
    measure_point("After lsr import")

    import ai.embeddings
    measure_point("After embeddings import (no model yet)")

    import ai.rag
    measure_point("After rag import (no index yet)")

    import ai.llm
    measure_point("After llm import")

    import ai.patterns
    measure_point("After patterns import")

    import ai.analysis
    measure_point("After analysis import")

    print("\n--- Loading classifier model ---")
    from ai.classifier import load_or_train_classifier
    load_or_train_classifier()
    measure_point("After classifier model loaded")

    print("\n--- Triggering embedding model load ---")
    from ai.embeddings import get_embedding_model
    get_embedding_model()
    measure_point("After SentenceTransformer model loaded")

    print("\n--- Building RAG index ---")
    from ai.rag import build_index
    build_index()
    measure_point("After RAG index built")

    print("\n--- Running analysis pipeline (V-102 test) ---")
    from ai.analysis import analyze_full_pipeline
    test_text = (
        "Worker entered separator vessel V-102 at Pump Station 4 for sludge removal "
        "without conducting mandatory atmospheric gas testing for H2S and O2 levels. "
        "No standby person was present at the manhole."
    )
    result = analyze_full_pipeline(test_text)
    measure_point("After /api/analyze (V-102)")
    print(f"  risk_level={result['risk_level']}, risk_score={result['risk_score']}")
    print(f"  lsr={result['lsr']['rule']}, match_strength={result['lsr']['match_strength']}")
    print(f"  barriers={result['precursors'].get('barrier_failures', [])}")
    print(f"  hazards={result['precursors'].get('hazards', [])}")
    print(f"  evidence_count={len(result.get('evidence', []))}")

    print("\n--- Running patterns ---")
    from ai.patterns import discover_precursor_clusters
    clusters = discover_precursor_clusters()
    measure_point("After /api/patterns")
    print(f"  cluster_count={len(clusters)}")

    print("\n=== MEASUREMENT SUMMARY COMPLETE ===")
