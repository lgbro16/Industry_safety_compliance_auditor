"""
hitl.py - Human-in-the-Loop Review Persistence Engine
Stores HSE Officer adjudications (CONFIRM, OVERRIDE, ESCALATE) for auditability
and model retraining datasets. Distinguishes 'AI-Flagged' from 'HSE-Confirmed'.
"""

import os
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
REVIEWS_PATH = os.path.join(DATA_DIR, "reviews.json")


def _load_reviews() -> List[Dict[str, Any]]:
    if not os.path.exists(REVIEWS_PATH):
        return []
    try:
        with open(REVIEWS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_reviews(reviews: List[Dict[str, Any]]):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(REVIEWS_PATH, "w", encoding="utf-8") as f:
        json.dump(reviews, f, indent=2)


def record_review(
    report_id: str,
    original_prediction: Optional[Dict[str, Any]] = None,
    decision: str = "CONFIRM",
    reviewer_comment: str = "",
    reviewer_name: str = "Lead Safety Officer",
    model_version: str = "sif-baseline-v1",
    **kwargs
) -> Dict[str, Any]:
    """Records a human review decision and persists the audit record."""
    dec = kwargs.get("action") or decision
    comm = kwargs.get("notes") or reviewer_comment
    rev = kwargs.get("reviewer") or reviewer_name
    pred = original_prediction or {}

    valid_decisions = ["CONFIRM", "OVERRIDE", "ESCALATE"]
    normalized_decision = dec.upper().strip()
    if normalized_decision not in valid_decisions:
        normalized_decision = "CONFIRM"

    review_entry = {
        "review_id": f"REV-{int(datetime.now().timestamp())}",
        "report_id": report_id,
        "action": normalized_decision,
        "decision": normalized_decision,
        "reviewer_decision": normalized_decision,
        "classification_status": "HSE-Confirmed SIF Precursor" if normalized_decision == "CONFIRM" else "AI-Flagged SIF Precursor (Adjudicated)",
        "status": "HSE-Confirmed SIF Precursor" if normalized_decision == "CONFIRM" else "AI-Flagged SIF Precursor (Adjudicated)",
        "reviewer_comment": comm or "Reviewed and verified against site safety protocols.",
        "reviewer_name": rev,
        "adjusted_sif": kwargs.get("adjusted_sif", True if normalized_decision == "CONFIRM" else False),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_version": model_version,
        "original_prediction": pred
    }

    reviews = _load_reviews()
    # Update if report_id exists, else append
    existing_idx = next((i for i, r in enumerate(reviews) if r.get("report_id") == report_id), None)
    if existing_idx is not None:
        reviews[existing_idx] = review_entry
    else:
        reviews.append(review_entry)

    _save_reviews(reviews)
    return review_entry


def get_all_reviews() -> List[Dict[str, Any]]:
    """Returns all recorded reviews."""
    return _load_reviews()


def get_review_for_report(report_id: str) -> Optional[Dict[str, Any]]:
    """Checks if a report has been adjudicated by HSE personnel."""
    reviews = _load_reviews()
    return next((r for r in reviews if r.get("report_id") == report_id), None)


# Convenience alias
get_reviews = get_all_reviews
