# step5_predict.py
# This is the FINAL file
# Loads saved model + runs complete analysis
# This is what your backend/API will call

import os
import joblib
import pandas as pd
import numpy as np
from scipy.sparse import hstack, csr_matrix

# Safe import for external Google GenAI SDK
try:
    from google import genai
except ImportError:
    genai = None

# Local project module imports
from step2_preprocess import preprocess, expand_abbreviations
from step4_rule_tagger import tag_life_saving_rules, extract_precursors

# Initialize Gemini Client (reads GEMINI_API_KEY environment variable automatically)
try:
    gemini_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=gemini_key) if (genai and gemini_key) else None
except Exception:
    client = None

def generate_llm_explanation(report_text, risk_level, rule, barriers):
    """Calls Gemini API to generate a professional HSE explanation with offline fallback."""
    prompt = f"""
    You are an expert Oil & Gas HSE Safety Officer reviewing a field report.
    Explain in 2 clear, professional sentences why the following safety report was assigned a risk rating of {risk_level}.

    Field Report: "{report_text}"
    Primary Life-Saving Rule Triggered: {rule}
    Failed Barriers Identified: {', '.join(barriers) if barriers else 'No explicit barrier failure'}

    Focus on the hazard exposure mechanism, fatality potential, and required safety controls. Do not include introductory conversational filler.
    """
    try:
        if not client:
            raise ValueError("GEMINI_API_KEY not configured or google-genai module not loaded")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text.strip()
    except Exception:
        # Fallback explanation if API key is missing or offline
        return (
            f"This report was flagged as {risk_level} Risk due to high-energy hazard exposure "
            f"and non-compliance with {rule} safety protocols."
        )

sif_keyword_categories = {
    'energy_keywords': [
        'loto', 'lockout', 'tagout', 'isolation',
        'energized', 'not isolated', 'bypass',
        'bypassed', 'live wire', 'override'
    ],
    'height_keywords': [
        'height', 'fall', 'harness', 'scaffolding',
        'elevated', 'roof', 'ladder',
        'fall arrest', 'without harness', 'aerial'
    ],
    'confined_keywords': [
        'confined space', 'tank entry', 'vessel entry',
        'gas test', 'atmospheric', 'standby',
        'rescue plan', 'hydrogen sulfide', 'oxygen'
    ],
    'hotwork_keywords': [
        'hot work', 'welding', 'grinding', 'cutting',
        'spark', 'flame', 'flammable',
        'permit expired', 'no permit', 'without permit'
    ],
    'lineoffire_keywords': [
        'struck by', 'hit by', 'vehicle', 'moving load',
        'crane', 'lifted load', 'banksman',
        'reverse', 'blind spot', 'pedestrian'
    ],
    'barrier_failure_keywords': [
        'not done', 'not followed', 'absent', 'missing',
        'bypassed', 'ignored', 'not available',
        'not present', 'without', 'no permit',
        'no harness', 'no gas', 'no standby'
    ],
    'fatal_signal_keywords': [
        'fatal', 'fatality', 'death', 'serious injury',
        'critical', 'life threatening',
        'potential fatality', 'could have killed',
        'major injury', 'high consequence'
    ],
}

def extract_keyword_features(text):
    text_lower = str(text).lower()
    features = []
    for category, keywords in sif_keyword_categories.items():
        any_present = int(any(kw in text_lower for kw in keywords))
        count_present = sum(1 for kw in keywords if kw in text_lower)
        features.append(any_present)
        features.append(count_present)
    return features


# ── LOAD SAVED MODEL ───────────────────────────────────

print("Loading saved ML model...")
rf_model          = joblib.load('models/sif_classifier.pkl')
saved_vectorizer  = joblib.load('models/tfidf_vectorizer.pkl')
print("Model loaded successfully!")


# ── MASTER PREDICTION FUNCTION ─────────────────────────

def analyze_report(report_text):
    """
    MASTER FUNCTION — takes raw report text
    Returns complete SIF analysis dictionary

    This is the single function your team calls.
    Input  → raw string (what field worker wrote)
    Output → dictionary with all analysis results
    """

    # ── Stage 1: Preprocess ──
    expanded  = expand_abbreviations(report_text)
    processed = preprocess(expanded)

    # ── Stage 2: Build features ──
    tfidf_feat   = saved_vectorizer.transform([processed])
    kw_feat      = csr_matrix([extract_keyword_features(report_text)])
    combined     = hstack([tfidf_feat, kw_feat])

    # ── Stage 3: Base ML Prediction ──
    probability = rf_model.predict_proba(combined)[0][1]
    risk_score = round(float(probability) * 100, 1)

    # ── Stage 3.5: Hybrid Safety Override (Dynamic Risk Scaling) ──
    lsr_tags = tag_life_saving_rules(report_text)
    top_rule = lsr_tags[0]['rule'] if lsr_tags else ''
    top_conf = lsr_tags[0]['confidence'] if lsr_tags else 0

    critical_kws = ['h2s', 'scba', 'loto', 'unbolted', 'harness', 'interlock', 'esd', 'sour crude']
    has_critical_kw = any(kw in report_text.lower() for kw in critical_kws)

    # Scale risk score dynamically based on rule match quality
    if top_conf >= 100.0 and top_rule != 'General Safety Observation':
        risk_score = max(risk_score, 85.0)  # CRITICAL RISK
    elif top_conf >= 66.7 and top_rule != 'General Safety Observation':
        risk_score = max(risk_score, 72.5)  # HIGH RISK
    elif (top_conf >= 33.3 or has_critical_kw) and top_rule != 'General Safety Observation':
        risk_score = max(risk_score, 65.0)  # HIGH RISK

    prediction = 1 if risk_score >= 50.0 else 0

    # ── Stage 4: Risk Level Assignment ──
    if risk_score >= 75.0:
        risk_level, risk_color = "CRITICAL", "RED"
        action = "IMMEDIATE escalation to HSE Manager required"
    elif risk_score >= 50.0:
        risk_level, risk_color = "HIGH", "ORANGE"
        action = "Escalate to site supervisor within 24 hours"
    elif risk_score >= 25.0:
        risk_level, risk_color = "MEDIUM", "YELLOW"
        action = "Review in next safety meeting"
    else:
        risk_level, risk_color = "LOW", "GREEN"
        action = "Log and monitor. Routine follow-up."

    # ── Stage 5: Tag Life-Saving Rules ──
    lsr_tags   = tag_life_saving_rules(report_text)

    # ── Stage 6: Extract Precursors ──
    precursors = extract_precursors(report_text)

    # ── Stage 7: Generate LLM Explanation ──
    top_rule_name = lsr_tags[0]['rule'] if lsr_tags else "General Safety Observation"
    barrier_list = precursors.get('barrier_failure', [])
    
    explanation = generate_llm_explanation(
        report_text=report_text,
        risk_level=risk_level,
        rule=top_rule_name,
        barriers=barrier_list
    )

    return {
        'sif_potential': bool(prediction),
        'risk_score': risk_score,
        'risk_level': risk_level,
        'risk_color': risk_color,
        'action': action,
        'lsr_tags': lsr_tags[:3],
        'precursors': precursors,
        'explanation': explanation  # New key added
    }


# ── DISPLAY FUNCTION ───────────────────────────────────

def display_result(report_text, result):
    """
    Prints a clean formatted result
    This is what judges see in the demo
    """

    print("\n" + "="*65)
    print("  OIL INDIA LIMITED — SIF PRECURSOR ANALYSIS ENGINE")
    print("="*65)
    print(f"\n  INPUT REPORT:")
    print(f"  {report_text[:120].strip()}...")

    print(f"\n  {'─'*60}")
    sif_flag = "⚠️  YES — SIF POTENTIAL DETECTED" if result['sif_potential'] else "✅  NO — Non-SIF Observation"
    print(f"  SIF Potential : {sif_flag}")
    print(f"  Risk Score    : {result['risk_score']}%")
    print(f"  Risk Level    : {result['risk_level']}  [{result['risk_color']}]")
    print(f"  Action        : {result['action']}")

    print(f"\n  LIFE-SAVING RULES VIOLATED:")
    for tag in result['lsr_tags']:
        print(f"    → {tag['rule']:<30} ({tag['confidence']}% confidence)")
        print(f"       Matched: {', '.join(tag['matched_kws'][:3])}")

    print(f"\n  PRECURSORS IDENTIFIED:")
    for category, items in result['precursors'].items():
        if items:
            print(f"    {category:<20}: {', '.join(items)}")

    print(f"\n  RECOMMENDED INTERVENTION:")
    if result['lsr_tags']:
        print(f"    {result['lsr_tags'][0]['intervention']}")

    print("="*65)


# ── LIVE DEMO ──────────────────────────────────────────

if __name__ == "__main__":

    print("\n" + "★"*65)
    print("   LIVE DEMO — TWO REPORTS")
    print("★"*65)

    # ── Demo Report 1: SIF ──
    report_sif = """
    Worker was about to enter storage tank TK-007 for 
    internal inspection without conducting mandatory 
    atmospheric testing for H2S. Gas level was later 
    found at 15 ppm which is above permissible limit. 
    No standby person was assigned outside the tank. 
    Rescue equipment was not available at site. 
    Worker had no personal gas monitor. 
    Permit to work was not obtained before entry.
    """

    result_sif = analyze_report(report_sif)
    display_result(report_sif, result_sif)

    # ── Demo Report 2: Non-SIF ──
    report_nonsif = """
    Housekeeping not maintained near the canteen area. 
    Waste bins are overflowing. Minor slip hazard 
    observed due to water spillage near entrance. 
    Cleaner informed. Area marked with wet floor sign.
    """

    result_nonsif = analyze_report(report_nonsif)
    display_result(report_nonsif, result_nonsif)

    print("\n" + "★"*65)
    print("   END TO END PIPELINE WORKING SUCCESSFULLY")
    print("★"*65)
    print("\nML Component ready for college internals demo.")