"""
lsr.py - IOGP-aligned Life-Saving Rule (LSR) Matching Engine
Evaluates reports against an IOGP-aligned Life-Saving Rule mapping.
Distinguishes canonical IOGP rules (IOGP Report 459) from prototype extension categories.
Combines dense semantic embedding similarity with rule-based keyword fallback.
Terminology compliance: Uses 'Rule Match Score' and 'Match Strength' (NOT 'Model Confidence').

MEMORY OPTIMIZATION: LSR rule description embeddings are precomputed ONCE and cached.
No separate SentenceTransformer model — uses the shared singleton from embeddings.py.
At runtime: ONE report embedding compared against cached rule embeddings.
"""

import os
import threading
import numpy as np
from typing import List, Dict, Optional
from ai.embeddings import embed_text, embed_documents, is_sentence_transformer_available

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
LSR_EMB_PATH = os.path.join(MODELS_DIR, "lsr_embeddings.npy")


# IOGP-aligned Life-Saving Rule mapping:
# Separates the canonical IOGP Life-Saving Rules (IOGP Report 459)
# from additional prototype extension categories (e.g. Ground Disturbance, PTW)
IOGP_ALIGNED_LIFE_SAVING_RULES = {
    # ── CANONICAL IOGP RULES (Report 459) ──
    "Confined Space Entry": {
        "rule_type": "canonical_iogp",
        "framework": "IOGP Report 459 (Canonical)",
        "description": (
            "Obtain authorization before entering a confined space. Verify energy isolation, "
            "perform mandatory atmospheric gas testing for oxygen deficiency, lower explosive limit flammable vapors, "
            "and hydrogen sulfide toxic gas. Ensure a qualified standby person hole watch is stationed at the manhole "
            "entrance at all times with emergency retrieval equipment and rescue plan."
        ),
        "keywords": [
            "confined space", "tank entry", "vessel entry", "manhole", "manway",
            "atmospheric testing", "gas test", "gas testing", "hydrogen sulfide", "h2s",
            "oxygen deficiency", "o2 levels", "standby person", "hole watch", "rescue plan",
            "separator vessel", "sludge removal", "sour crude", "scba"
        ],
        "mandatory_action": "Halt confined space entry immediately. Verify atmospheric testing and standby watch protocol before re-entry."
    },
    "Energy Isolation": {
        "rule_type": "canonical_iogp",
        "framework": "IOGP Report 459 (Canonical)",
        "description": (
            "Verify isolation before work begins. Apply Lockout/Tagout (LOTO) on all electrical, "
            "mechanical, hydraulic, and pressurized fluid lines. Test for zero energy state and bleed residual pressure."
        ),
        "keywords": [
            "loto", "lockout", "tagout", "isolation", "isolated", "not isolated",
            "energized", "live wire", "breaker tagged", "bypass valve", "stored pressure",
            "de-energize", "double block and bleed"
        ],
        "mandatory_action": "Halt maintenance activity. Enforce formal zero-energy verification and audit LOTO compliance."
    },
    "Hot Work": {
        "rule_type": "canonical_iogp",
        "framework": "IOGP Report 459 (Canonical)",
        "description": (
            "Control flammables and ignition sources. Conduct gas testing for flammable atmosphere (LEL) "
            "in hazardous zones. Post a certified fire watch with fire extinguisher during welding, cutting, or grinding."
        ),
        "keywords": [
            "hot work", "welding", "cutting", "grinding", "spark", "flame",
            "ignition", "flammable area", "fire watch", "fire extinguisher", "angle grinder"
        ],
        "mandatory_action": "Suspend hot work. Re-test atmospheric LEL and re-post dedicated fire watch with extinguisher."
    },
    "Work at Height": {
        "rule_type": "canonical_iogp",
        "framework": "IOGP Report 459 (Canonical)",
        "description": (
            "Protect yourself against a fall when working at height. Maintain 100% tie-off using certified "
            "full body harness, self-retracting lifeline (SRL), and inspect scaffolding guardrails and toe-boards."
        ),
        "keywords": [
            "height", "fall", "harness", "scaffolding", "scaffold", "monkey board",
            "ladder", "fall arrest", "without harness", "unprotected edge", "srl"
        ],
        "mandatory_action": "Cease work at elevation immediately until 100% tie-off and certified fall arrest anchorages are verified."
    },
    "Line of Fire": {
        "rule_type": "canonical_iogp",
        "framework": "IOGP Report 459 (Canonical)",
        "description": (
            "Keep yourself and others out of the line of fire. Position clear of moving machinery, rotary tables, "
            "top drive red zones, high-pressure test hoses, and suspended loads. Enforce physical barricades and banksman control."
        ),
        "keywords": [
            "line of fire", "struck by", "hit by", "rotary table", "top drive",
            "red zone", "moving iron", "banksman", "spotter", "projectile", "whipping hose"
        ],
        "mandatory_action": "Evacuate red zone perimeter. Verify positive exclusion barriers and operational communication before resuming."
    },
    "Bypassing Safety Controls": {
        "rule_type": "canonical_iogp",
        "framework": "IOGP Report 459 (Canonical)",
        "description": (
            "Obtain authorization before overriding or disabling safety controls. Never gag relief valves, "
            "override Emergency Shutdown (ESD) valves, or bypass safety interlocks without formal MOC approval."
        ),
        "keywords": [
            "bypass", "bypassed", "override", "gagged", "c-clamp", "interlock",
            "esd", "relief valve", "psv", "management of change", "moc"
        ],
        "mandatory_action": "Restore safety device to operational status immediately. Initiate formal MOC risk assessment review."
    },
    "Mechanical Lifting": {
        "rule_type": "canonical_iogp",
        "framework": "IOGP Report 459 (Canonical)",
        "description": (
            "Plan lifting operations and control the area. Never walk or stand beneath a suspended load. "
            "Inspect wire ropes, slings, and rigging shackles prior to hoisting."
        ),
        "keywords": [
            "crane", "lifting", "rigging", "sling", "hoist", "suspended load",
            "wire rope", "load chart", "banksman", "rigger"
        ],
        "mandatory_action": "Halt crane lift. Clear all personnel from drop exclusion zone and inspect rigging integrity."
    },
    "Driving": {
        "rule_type": "canonical_iogp",
        "framework": "IOGP Report 459 (Canonical)",
        "description": (
            "Follow safe driving rules and journey management plans. Wear seatbelts, obey oilfield speed limits, "
            "and avoid mobile phone distractions."
        ),
        "keywords": [
            "driving", "speeding", "seatbelt", "vehicle accident", "journey management",
            "fatigue", "speed limit"
        ],
        "mandatory_action": "Review driver journey management compliance and conduct safety stand-down with transport crew."
    },
    # ── PROTOTYPE EXTENSION CATEGORIES ──
    "Ground Disturbance": {
        "rule_type": "prototype_extension",
        "framework": "SIF-GUARD Prototype Extension (Industry Precedent)",
        "description": (
            "Stop and verify underground services before digging or excavating. Obtain ground disturbance permit, "
            "scan utility drawings, and hand-dig near marked hydrocarbon pipelines."
        ),
        "keywords": [
            "excavation", "digging", "ground disturbance", "pipeline strike",
            "buried cable", "utility map", "trench", "pipe locator"
        ],
        "mandatory_action": "Stop mechanical digging. Conduct electronic pipe locating survey before continuing excavation."
    },
    "Safe System of Work / PTW": {
        "rule_type": "prototype_extension",
        "framework": "SIF-GUARD Prototype Extension (Aligned with IOGP Work Authorization / OISD-105)",
        "description": (
            "Conduct work strictly under an authorized Permit to Work with completed Job Safety Analysis (JSA) "
            "and pre-job toolbox talk (TBM)."
        ),
        "keywords": [
            "permit to work", "ptw", "no permit", "without permit", "toolbox talk",
            "jsa", "unauthorized work"
        ],
        "mandatory_action": "Suspend task execution until authorized PTW is endorsed and pre-job safety brief is completed."
    }
}

# Alias for backward compatibility
IOGP_LIFE_SAVING_RULES = IOGP_ALIGNED_LIFE_SAVING_RULES

# ── PRECOMPUTED RULE EMBEDDING CACHE ──────────────────────────────────────
# Rule descriptions are static — computed ONCE, reused every request.
# Protects against re-embedding the same 10 sentences on every analyze call.
_RULE_NAMES: List[str] = []
_RULE_DESCS: List[str] = []
_RULE_EMBEDDINGS: Optional[np.ndarray] = None  # shape: (N_rules, 384)
_CACHE_LOCK = threading.Lock()


def _ensure_rule_embeddings_cached():
    """
    Precomputes and caches embeddings for all LSR descriptions.
    Called lazily on first match_life_saving_rules() invocation.
    Thread-safe via lock; only computed once.
    """
    global _RULE_NAMES, _RULE_DESCS, _RULE_EMBEDDINGS

    if _RULE_EMBEDDINGS is not None:
        return  # Already cached

    with _CACHE_LOCK:
        if _RULE_EMBEDDINGS is not None:
            return  # Another thread cached it while we waited

        names = list(IOGP_ALIGNED_LIFE_SAVING_RULES.keys())
        descs = [data["description"] for data in IOGP_ALIGNED_LIFE_SAVING_RULES.values()]

        # 1. Prefer persisted precomputed embeddings from disk (instant, 0 MB overhead)
        if os.path.exists(LSR_EMB_PATH):
            try:
                loaded = np.load(LSR_EMB_PATH).astype(np.float32)
                if len(loaded) == len(names):
                    _RULE_EMBEDDINGS = loaded
                    _RULE_NAMES = names
                    _RULE_DESCS = descs
                    print(f"[LSR] Loaded {len(names)} precomputed rule embeddings from disk.")
                    return
            except Exception as e:
                print(f"[LSR] Disk load notice: {e}. Computing dynamically...")

        if is_sentence_transformer_available():
            # Batch-embed all rule descriptions in one model call
            embs = embed_documents(descs)
            # Normalize each row
            norms = np.linalg.norm(embs, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            embs = embs / norms
            _RULE_EMBEDDINGS = embs.astype(np.float32)
            print(f"[LSR] Precomputed embeddings for {len(names)} Life-Saving Rules (cached).")
        else:
            _RULE_EMBEDDINGS = np.array([])  # Mark as attempted but unavailable
            print("[LSR] SentenceTransformer unavailable — using keyword-only LSR matching.")

        _RULE_NAMES = names
        _RULE_DESCS = descs


def match_life_saving_rules(report_text: str) -> List[Dict]:
    """
    Evaluates report against IOGP Life-Saving Rules using semantic embeddings
    combined with domain keyword matching as a fallback layer.

    MEMORY OPTIMIZATION:
      - LSR rule embeddings are precomputed once and reused.
      - ONE report embedding is computed per call via embed_text().
      - Cosine similarity computed as matrix dot product (no repeated model calls).
    """
    if not report_text or not report_text.strip():
        return [{
            "rule": "General Safety Observation",
            "match_strength": "LOW",
            "score": 0.20,
            "matched_kws": [],
            "intervention": "Log routine observation card. Review at weekly safety meeting."
        }]

    # Ensure rule embeddings are cached (lazy, once)
    _ensure_rule_embeddings_cached()

    text_lower = report_text.lower()
    matches = []

    # Compute ONE report embedding for the entire LSR matching pass
    report_emb = None
    sem_available = is_sentence_transformer_available()
    if sem_available and _RULE_EMBEDDINGS is not None and len(_RULE_EMBEDDINGS) > 0:
        report_emb = embed_text(report_text)
        r_norm = np.linalg.norm(report_emb)
        if r_norm > 0:
            report_emb = report_emb / r_norm
        else:
            report_emb = None

    # Compute all cosine similarities in one matrix dot product
    sem_scores = {}
    if report_emb is not None and _RULE_EMBEDDINGS is not None and len(_RULE_EMBEDDINGS) > 0:
        dots = np.dot(_RULE_EMBEDDINGS, report_emb)  # shape: (N_rules,)
        for i, rule_name in enumerate(_RULE_NAMES):
            # Rescale cosine [-1, 1] → [0, 1]
            sem_scores[rule_name] = max(0.0, min(1.0, (float(dots[i]) + 1.0) / 2.0))

    for rule_name, data in IOGP_ALIGNED_LIFE_SAVING_RULES.items():
        kws = data["keywords"]
        intervention = data["mandatory_action"]

        # 1. Keyword overlap
        matched_kws = [kw for kw in kws if kw in text_lower]
        kw_score = min(len(matched_kws) / 3.0, 1.0)

        # 2. Semantic similarity (from precomputed cache)
        sem_sim = sem_scores.get(rule_name, 0.0)

        # Blended Match Score: 60% semantic similarity + 40% keyword density
        if matched_kws:
            combined_score = 0.55 * sem_sim + 0.45 * kw_score
            combined_score = min(1.0, combined_score + (0.1 if len(matched_kws) >= 2 else 0.05))
        else:
            combined_score = sem_sim * 0.75  # Penalize if zero keywords matched

        combined_score = round(max(0.0, min(1.0, combined_score)), 3)

        # Determine Match Strength band
        if combined_score >= 0.75 or (len(matched_kws) >= 2 and combined_score >= 0.65):
            strength = "HIGH"
        elif combined_score >= 0.50 or len(matched_kws) >= 1:
            strength = "MEDIUM"
        else:
            strength = "LOW"

        if combined_score >= 0.35 or matched_kws:
            matches.append({
                "rule": rule_name,
                "match_strength": strength,
                "score": combined_score,
                "matched_kws": matched_kws,
                "intervention": intervention,
                "rule_type": data.get("rule_type", "canonical_iogp"),
                "is_canonical_iogp": data.get("rule_type") == "canonical_iogp",
                "framework": data.get("framework", "IOGP Report 459 (Canonical)"),
                "mapping_framework": "IOGP-aligned Life-Saving Rule mapping"
            })

    # Sort by score descending
    matches.sort(key=lambda x: x["score"], reverse=True)

    if not matches:
        matches = [{
            "rule": "General Safety Observation",
            "match_strength": "LOW",
            "score": 0.25,
            "matched_kws": [],
            "intervention": "Log routine observation card. Review at weekly safety meeting.",
            "rule_type": "prototype_extension",
            "is_canonical_iogp": False,
            "framework": "General Field Safety Protocol",
            "mapping_framework": "IOGP-aligned Life-Saving Rule mapping"
        }]

    return matches
