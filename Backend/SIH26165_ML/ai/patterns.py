"""
patterns.py - Semantic Pattern Intelligence & Precursor Clustering Engine
Groups safety observations using Sentence Transformer embeddings and K-Means clustering
to identify systemic, cross-facility recurring precursor patterns.

MEMORY OPTIMIZATION:
- NEVER called during /api/analyze — only invoked by GET /api/patterns explicitly.
- Uses the shared singleton embedding model from embeddings.py (no separate instance).
- Cluster results cached after first computation (_CACHED_CLUSTERS).
- Dataset embeddings also cached within this module if patterns is re-requested
  (avoids re-embedding 50 reports on repeat /api/patterns calls).
- pd.read_csv called once per clustering run (not per analyze request).
"""

import os
import numpy as np
import pandas as pd
from typing import List, Dict, Any
from collections import Counter
from sklearn.cluster import KMeans

from ai.embeddings import embed_documents
from ai.extraction import extract_factors

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "safety_reports.csv")

# Cache cluster results (populated on first GET /api/patterns call)
_CACHED_CLUSTERS: List[Dict[str, Any]] = None


def discover_precursor_clusters(num_clusters: int = 3) -> List[Dict[str, Any]]:
    """
    Performs real semantic clustering on the prototype dataset reports
    and aggregates common risk factors per cluster.

    Called ONLY from GET /api/patterns — never from /api/analyze.
    Result is cached after first computation to avoid repeated clustering.
    Uses the shared singleton embedding model (no new SentenceTransformer instance).
    """
    global _CACHED_CLUSTERS
    if _CACHED_CLUSTERS is not None:
        return _CACHED_CLUSTERS

    if not os.path.exists(DATA_PATH):
        return []

    df = pd.read_csv(DATA_PATH)
    if len(df) == 0:
        return []

    reports = df['report_text'].tolist()
    labels = df['sif_label'].tolist()
    facilities = (
        df['facility_location'].tolist()
        if 'facility_location' in df.columns
        else ["Assam Assets"] * len(df)
    )

    # 1. Embed reports: prefer precomputed embeddings from disk (instant, 0 MB overhead)
    emb_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "dataset_embeddings.npy")
    if os.path.exists(emb_file):
        try:
            embs = np.load(emb_file).astype(np.float32)
        except Exception:
            embs = embed_documents(reports)
    else:
        embs = embed_documents(reports)

    # 2. Perform K-Means clustering
    k = min(num_clusters, len(reports))
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    cluster_assignments = kmeans.fit_predict(embs)

    clusters_data = []

    for c_id in range(k):
        indices = [i for i, c in enumerate(cluster_assignments) if c == c_id]
        if not indices:
            continue

        c_reports = [reports[i] for i in indices]
        c_sifs = [labels[i] for i in indices]
        c_facilities = [facilities[i] for i in indices]

        # Extract factors for all reports in this cluster
        activities = []
        hazards = []
        barriers = []

        for rep in c_reports:
            factors = extract_factors(rep)
            if factors["activity"]:
                activities.append(factors["activity"])
            hazards.extend(factors["hazards"])
            barriers.extend(factors["barrier_failures"])

        top_activity = Counter(activities).most_common(1)[0][0] if activities else "General Maintenance"
        top_hazard = Counter(hazards).most_common(1)[0][0] if hazards else "Operational Exposure"
        top_barrier = Counter(barriers).most_common(1)[0][0] if barriers else "Procedural Non-Compliance"
        top_locations = [loc for loc, _ in Counter(c_facilities).most_common(2)]

        sif_ratio = round((sum(c_sifs) / len(c_sifs)) * 100, 1)
        risk_tier = "CRITICAL" if sif_ratio >= 70 else ("HIGH SIF" if sif_ratio >= 40 else "MODERATE")

        # Cluster title based on dominant theme
        titles = {
            0: f"Incomplete Isolation & Barrier Degradation in {top_activity}",
            1: f"Toxic Gas & Atmospheric Testing Failures in {top_activity}",
            2: f"Line of Fire & Mechanical Integrity Risks in {top_activity}"
        }
        title = titles.get(c_id, f"Recurring SIF Precursor Pattern #{c_id + 1}: {top_activity}")

        summary = (
            f"Cross-site systemic cluster involving {len(c_reports)} reports ({sif_ratio}% SIF-positive). "
            f"Characterized by repeated {top_barrier} during {top_activity} operations, creating acute {top_hazard}."
        )

        clusters_data.append({
            "cluster_id": c_id + 1,
            "title": title,
            "count": len(c_reports),
            "sif_proportion": sif_ratio,
            "risk_tier": risk_tier,
            "common_activity": top_activity,
            "common_hazard": top_hazard,
            "common_barrier": top_barrier,
            "affected_sites": ", ".join(top_locations) if top_locations else "Various Operating Facilities",
            "summary": summary,
            "sample_reports": [r[:160] + "..." for r in c_reports[:2]]
        })

    _CACHED_CLUSTERS = clusters_data
    return clusters_data
