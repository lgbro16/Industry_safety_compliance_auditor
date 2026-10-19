"""
analysis.py - Master SIF-GUARD AI Analysis Orchestrator
Coordinates the complete, explainable AI safety intelligence pipeline:
Text Preprocessing -> Hybrid SIF Classifier -> Information Extraction ->
Semantic LSR Matching -> FAISS/RAG Retrieval -> Grounded LLM Explanation ->
Similar Precursor Retrieval -> Audit Metadata & Versioning.

MEMORY OPTIMIZATION:
- Dataset reports loaded once into _REPORTS_CACHE (lazy).
- Report embeddings for similar-report lookup: dataset embeddings are
  precomputed once and cached (_DATASET_EMBEDDINGS). Query embedding
  computed once per request via ONE encode() call, then compared as
  a matrix dot product — no per-report encode() calls.
"""

import os
import threading
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from ai.preprocessing import preprocess
from ai.classifier import predict_sif_risk
from ai.extraction import extract_factors
from ai.lsr import match_life_saving_rules
from ai.rag import get_relevant_safety_evidence, get_knowledge_base_version
from ai.llm import generate_grounded_explanation, get_llm_model_name
from ai.embeddings import get_embedding_model_name, embed_text, embed_documents, is_sentence_transformer_available

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "safety_reports.csv")

_REPORTS_CACHE: List[Dict[str, Any]] = []
_DATASET_EMBEDDINGS: Optional[np.ndarray] = None  # shape: (N, 384) — computed once
_DATASET_TEXTS: List[str] = []
_DATASET_LOCK = threading.Lock()


def _ensure_dataset_ready():
    """
    Loads dataset reports and precomputes embeddings ONCE.
    Thread-safe. Subsequent calls return immediately.
    """
    global _REPORTS_CACHE, _DATASET_EMBEDDINGS, _DATASET_TEXTS

    if _DATASET_EMBEDDINGS is not None or not is_sentence_transformer_available():
        if _REPORTS_CACHE:
            return
        # Embedding model unavailable — load reports only (for keyword fallback)
        if not _REPORTS_CACHE and os.path.exists(DATA_PATH):
            try:
                df = pd.read_csv(DATA_PATH)
                _REPORTS_CACHE = df.to_dict(orient="records")
            except Exception:
                _REPORTS_CACHE = []
        return

    with _DATASET_LOCK:
        if _DATASET_EMBEDDINGS is not None:
            return  # Another thread cached it

        if not os.path.exists(DATA_PATH):
            _REPORTS_CACHE = []
            _DATASET_EMBEDDINGS = np.empty((0, 384), dtype=np.float32)
            return

        try:
            df = pd.read_csv(DATA_PATH)
            _REPORTS_CACHE = df.to_dict(orient="records")
            texts = [str(r.get("report_text", "")) for r in _REPORTS_CACHE]
            _DATASET_TEXTS = texts

            # 1. Prefer persisted precomputed embeddings from disk (instant, 0 MB overhead)
            emb_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "dataset_embeddings.npy")
            if os.path.exists(emb_file):
                try:
                    loaded = np.load(emb_file).astype(np.float32)
                    if len(loaded) == len(texts):
                        _DATASET_EMBEDDINGS = loaded
                        print(f"[Analysis] Loaded {len(texts)} precomputed dataset embeddings from disk.")
                        return
                except Exception as e:
                    print(f"[Analysis] Disk load notice: {e}. Computing dynamically...")

            # Fallback: compute dynamically if not on disk
            embs = embed_documents(texts)
            norms = np.linalg.norm(embs, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            _DATASET_EMBEDDINGS = (embs / norms).astype(np.float32)
            print(f"[Analysis] Precomputed embeddings for {len(texts)} dataset reports (cached).")
        except Exception as e:
            print(f"[Analysis] Dataset precompute notice: {e}")
            _REPORTS_CACHE = []
            _DATASET_EMBEDDINGS = np.empty((0, 384), dtype=np.float32)


def find_similar_reports(query_text: str, top_k: int = 2) -> List[Dict[str, Any]]:
    """
    Retrieves genuinely similar safety reports from the curated dataset.

    MEMORY OPTIMIZATION:
      - Dataset embeddings precomputed once (_DATASET_EMBEDDINGS).
      - ONE query embedding per call, then matrix dot product.
      - No per-report encode() calls during request handling.
    """
    _ensure_dataset_ready()

    if not _REPORTS_CACHE:
        return []

    # Semantic path: matrix dot product with precomputed embeddings
    if (
        is_sentence_transformer_available()
        and _DATASET_EMBEDDINGS is not None
        and len(_DATASET_EMBEDDINGS) > 0
    ):
        q_vec = embed_text(query_text).astype(np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            return []
        q_vec = q_vec / q_norm

        # One matrix multiply to get all cosine similarities
        dots = np.dot(_DATASET_EMBEDDINGS, q_vec)  # shape: (N,)

        results = []
        for idx in np.argsort(dots)[::-1]:
            r = _REPORTS_CACHE[idx]
            rep_text = r.get("report_text", "")
            if rep_text.strip() == query_text.strip():
                continue
            sim_raw = float(dots[idx])
            sim = max(0.0, min(1.0, (sim_raw + 1.0) / 2.0))
            if sim < 0.45:
                break  # Sorted desc — nothing below threshold
            results.append({
                "report_id": r.get("report_id", "HIST-OBS"),
                "similarity_score": round(sim, 3),
                "text": rep_text[:140] + "...",
                "location": r.get("facility_location", r.get("location", "Asset Facility")),
                "sif_label": int(r.get("sif_label", 0)),
                "risk_level": r.get("risk_level", "HIGH" if r.get("sif_label") == 1 else "LOW")
            })
            if len(results) >= top_k:
                break
        return results

    # Lexical fallback path (no model)
    _ensure_dataset_ready()
    t1_words = set(w.lower() for w in query_text.split() if len(w) > 2)
    scored = []
    for r in _REPORTS_CACHE:
        rep_text = r.get("report_text", "")
        if rep_text.strip() == query_text.strip():
            continue
        t2_words = set(w.lower() for w in rep_text.split() if len(w) > 2)
        if not t1_words or not t2_words:
            continue
        jaccard = len(t1_words & t2_words) / float(len(t1_words | t2_words))
        if jaccard > 0.20:
            scored.append((jaccard, r))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for sim, r in scored[:top_k]:
        rep_text = r.get("report_text", "")
        results.append({
            "report_id": r.get("report_id", "HIST-OBS"),
            "similarity_score": round(sim, 3),
            "text": rep_text[:140] + "...",
            "location": r.get("facility_location", r.get("location", "Asset Facility")),
            "sif_label": int(r.get("sif_label", 0)),
            "risk_level": r.get("risk_level", "HIGH" if r.get("sif_label") == 1 else "LOW")
        })
    return results


def analyze_full_pipeline(report_text: str) -> Dict[str, Any]:
    """
    MASTER PIPELINE FUNCTION:
    Analyzes raw safety report text through the complete explainable architecture.
    """
    if not report_text or not report_text.strip():
        raise ValueError("Report text must not be empty.")

    # 1. Base ML Classifier (Leakage-free TF-IDF + Domain Features + Random Forest)
    clf_res = predict_sif_risk(report_text)

    # 2. Structured Information Extraction (Activity, Location, Hazards, Barriers, Consequences)
    precursors = extract_factors(report_text)

    # 3. Semantic Life-Saving Rule Matching (Dense Embedding + Keyword Fallback)
    lsr_matches = match_life_saving_rules(report_text)
    top_lsr = lsr_matches[0] if lsr_matches else {
        "rule": "General Safety Observation",
        "match_strength": "LOW",
        "score": 0.20,
        "intervention": "Log routine observation."
    }

    # 4. RAG Retrieval from Authoritative Safety Standards
    evidence_chunks = get_relevant_safety_evidence(report_text, top_k=3)
    formatted_evidence = []
    for ev in evidence_chunks:
        formatted_evidence.append({
            "source": ev.get("source", "Safety Standard"),
            "category": ev.get("category", "Safety Reference Extract"),
            "section": ev.get("section", "Standard Clause"),
            "text": ev.get("text", ""),
            "score": ev.get("score", 0.85),
            "retrieval_mode": ev.get("retrieval_mode", "semantic"),
            "retrieval_status": ev.get("retrieval_status", "Semantic retrieval active (all-MiniLM-L6-v2)")
        })

    # If evidence is empty, provide clear factual indication (ZERO fabrication)
    if not formatted_evidence:
        formatted_evidence = [{
            "source": "Prototype Knowledge Base",
            "category": "Notice",
            "section": "Notice",
            "text": "Safety reference extracts unavailable for query.",
            "score": 0.0,
            "retrieval_mode": "none",
            "retrieval_status": "No matching reference extracts found."
        }]

    # 5. Grounded LLM Explanation (Strictly bounded by evidence)
    llm_res = generate_grounded_explanation(
        report_text=report_text,
        risk_level=clf_res["risk_level"],
        risk_score=clf_res["risk_score"],
        rule=top_lsr["rule"],
        precursors=precursors,
        evidence=evidence_chunks
    )

    # 6. Semantic Similar Historical Precursors
    similar_patterns = find_similar_reports(report_text, top_k=2)

    # 7. Model Versioning & Audit Metadata
    timestamp = datetime.now(timezone.utc).isoformat()
    model_metadata = {
        "name": clf_res["model_name"],
        "version": clf_res["model_version"],
        "embedding_model": get_embedding_model_name(),
        "llm_model": llm_res.get("llm_model", get_llm_model_name()),
        "knowledge_base_version": get_knowledge_base_version(),
        "analysis_timestamp": timestamp
    }

    return {
        # SIF Assessment
        "risk_score": clf_res["risk_score"],
        "risk_level": clf_res["risk_level"],
        "risk_color": clf_res["risk_color"],
        "sif_potential": clf_res["sif_potential"],
        "action": clf_res["action"],

        # Model Metadata
        "model": model_metadata,

        # Extracted Factors
        "precursors": precursors,

        # Applicable Life-Saving Rule
        "lsr": {
            "rule": top_lsr["rule"],
            "match_strength": top_lsr["match_strength"],
            "score": top_lsr["score"],
            "intervention": top_lsr.get("intervention", ""),
            "rule_type": top_lsr.get("rule_type", "canonical_iogp"),
            "framework": top_lsr.get("framework", "IOGP Report 459 (Canonical)"),
            "mapping_framework": top_lsr.get("mapping_framework", "IOGP-aligned Life-Saving Rule mapping")
        },
        "lsr_tags": lsr_matches[:3],  # For legacy UI backward compatibility

        # Grounded Explanation & Recommendations
        "explanation": llm_res["explanation"],
        "recommendation": llm_res["recommendation"],

        # Safety Evidence
        "evidence": formatted_evidence,

        # Semantic Similar Patterns
        "similar_patterns": similar_patterns
    }


# Convenience alias for tests and external callers
analyze_report = analyze_full_pipeline
