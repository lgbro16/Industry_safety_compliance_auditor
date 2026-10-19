"""
classifier.py - Baseline Hybrid NLP SIF Classifier
Uses TF-IDF + domain-derived safety features + Random Forest.
Strictly leakage-free: Uses ONLY report_text and derived text signals.
Outputs: SIF Risk Score (0-100), NOT 'probability'.
"""

import os
import joblib
import numpy as np
import pandas as pd
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

from ai.preprocessing import preprocess, expand_abbreviations

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "safety_reports.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "sif_classifier.pkl")
VECTORIZER_PATH = os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl")

# Domain safety keywords for feature engineering (derived exclusively from text)
SIF_KEYWORD_CATEGORIES = {
    'energy_keywords': [
        'loto', 'lockout', 'tagout', 'isolation', 'energized', 'not isolated',
        'bypass', 'bypassed', 'live wire', 'override', 'bleed valve', 'double block'
    ],
    'height_keywords': [
        'height', 'fall', 'harness', 'scaffolding', 'elevated', 'roof',
        'ladder', 'fall arrest', 'without harness', 'aerial', 'monkey board', 'tie-off'
    ],
    'confined_keywords': [
        'confined space', 'tank entry', 'vessel entry', 'gas test', 'atmospheric',
        'standby', 'rescue plan', 'hydrogen sulfide', 'oxygen', 'h2s', 'manhole',
        'sludge removal', 'scba', 'hole watch'
    ],
    'hotwork_keywords': [
        'hot work', 'welding', 'grinding', 'cutting', 'spark', 'flame',
        'flammable', 'permit expired', 'no permit', 'without permit', 'fire watch'
    ],
    'lineoffire_keywords': [
        'struck by', 'hit by', 'vehicle', 'moving load', 'crane', 'lifted load',
        'banksman', 'reverse', 'blind spot', 'pedestrian', 'rotary table', 'red zone'
    ],
    'barrier_failure_keywords': [
        'not done', 'not followed', 'absent', 'missing', 'bypassed', 'ignored',
        'not available', 'not present', 'without', 'no permit', 'no harness',
        'no gas', 'no standby', 'gagged', 'taped over', 'fault'
    ],
    'fatal_signal_keywords': [
        'fatal', 'fatality', 'death', 'serious injury', 'critical',
        'life threatening', 'potential fatality', 'could have killed',
        'major injury', 'high consequence', 'idlh', 'asphyxiat'
    ],
}


def extract_keyword_features(text: str) -> list:
    """Extracts keyword counts from raw text without any label leakage."""
    text_lower = str(text).lower()
    features = []
    for _, keywords in SIF_KEYWORD_CATEGORIES.items():
        any_present = int(any(kw in text_lower for kw in keywords))
        count_present = sum(1 for kw in keywords if kw in text_lower)
        features.append(any_present)
        features.append(count_present)
    return features


_CLASSIFIER = None
_VECTORIZER = None


def load_or_train_classifier():
    """Loads existing trained model or trains a fresh baseline if missing."""
    global _CLASSIFIER, _VECTORIZER

    if _CLASSIFIER is not None and _VECTORIZER is not None:
        return _CLASSIFIER, _VECTORIZER

    os.makedirs(MODELS_DIR, exist_ok=True)

    if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
        try:
            _CLASSIFIER = joblib.load(MODEL_PATH)
            _VECTORIZER = joblib.load(VECTORIZER_PATH)
            print("[Classifier] Loaded baseline SIF model successfully.")
            return _CLASSIFIER, _VECTORIZER
        except Exception as e:
            print(f"[Classifier] Notice loading existing model: {e}. Retraining fresh baseline...")

    train_baseline_model()
    return _CLASSIFIER, _VECTORIZER


def train_baseline_model():
    """Trains the baseline classifier on the curated dataset without data leakage."""
    global _CLASSIFIER, _VECTORIZER

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    # Deduplicate based on report_text
    df = df.drop_duplicates(subset=['report_text']).reset_index(drop=True)

    # Process text
    processed_texts = [preprocess(t) for t in df['report_text']]

    _VECTORIZER = TfidfVectorizer(
        max_features=250,
        ngram_range=(1, 3),
        min_df=1,
        max_df=0.95,
        sublinear_tf=True
    )

    X_tfidf = _VECTORIZER.fit_transform(processed_texts)
    kw_features = np.array([extract_keyword_features(t) for t in df['report_text']])
    X_combined = hstack([X_tfidf, csr_matrix(kw_features)])

    y = df['sif_label'].values

    _CLASSIFIER = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        random_state=42,
        class_weight='balanced',
        n_jobs=1  # Single worker on Render Free — avoid parallel memory duplication
    )
    _CLASSIFIER.fit(X_combined, y)

    joblib.dump(_CLASSIFIER, MODEL_PATH)
    joblib.dump(_VECTORIZER, VECTORIZER_PATH)
    print(f"[Classifier] Trained baseline Random Forest on {len(df)} curated reports.")


def predict_sif_risk(report_text: str) -> dict:
    """
    Computes SIF Risk Score (0-100) and risk level using the Baseline Hybrid NLP Classifier.
    """
    clf, vec = load_or_train_classifier()

    processed = preprocess(report_text)
    tfidf_feat = vec.transform([processed])
    kw_feat = csr_matrix([extract_keyword_features(report_text)])
    combined = hstack([tfidf_feat, kw_feat])

    # Raw model prediction probability from random forest
    prob = clf.predict_proba(combined)[0][1]
    raw_score = float(prob) * 100.0

    # Domain safety escalation logic (Hybrid Safety Scaling)
    text_lower = report_text.lower()
    critical_signals = [
        'h2s', 'hydrogen sulfide', 'without atmospheric', 'no gas test',
        'no standby', 'unbolted', 'live line', 'c-clamp', 'sour crude', 'scba',
        'relief valve gagged', 'red zone'
    ]
    matched_critical = [kw for kw in critical_signals if kw in text_lower]

    if len(matched_critical) >= 2:
        risk_score = max(raw_score, 86.5)
    elif len(matched_critical) == 1:
        risk_score = max(raw_score, 74.0)
    else:
        risk_score = raw_score

    risk_score = round(max(0.0, min(100.0, risk_score)), 1)
    sif_potential = risk_score >= 50.0

    if risk_score >= 75.0:
        risk_level = "CRITICAL"
        risk_color = "RED"
        action = "IMMEDIATE escalation to HSE Manager required"
    elif risk_score >= 50.0:
        risk_level = "HIGH"
        risk_color = "ORANGE"
        action = "Escalate to site supervisor within 24 hours"
    elif risk_score >= 25.0:
        risk_level = "MEDIUM"
        risk_color = "YELLOW"
        action = "Review in next facility safety toolbox meeting"
    else:
        risk_level = "LOW"
        risk_color = "GREEN"
        action = "Log and monitor. Routine follow-up."

    return {
        "sif_potential": sif_potential,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "action": action,
        "model_name": "Baseline Hybrid NLP Classifier",
        "model_version": "sif-baseline-v1"
    }
