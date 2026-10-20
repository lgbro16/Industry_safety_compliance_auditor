"""
llm.py - Grounded GenAI Explanation & Decision Support
Interfaces with Google Gemini via google-genai SDK, strictly bounded by retrieved RAG evidence.
Includes robust offline fallback if API key is absent or network is unavailable.
"""

import os
from typing import Dict, List, Any

# Safe import of Google GenAI SDK
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

GEMINI_MODEL = "gemini-2.5-flash"


def _get_client():
    """Initializes Gemini client from environment variable."""
    if not genai:
        return None
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"[LLM] Notice initializing Gemini client: {e}")
        return None


def generate_grounded_explanation(
    report_text: str,
    risk_level: str,
    risk_score: float,
    rule: str,
    precursors: Dict[str, Any],
    evidence: List[Dict[str, Any]]
) -> Dict[str, str]:
    """
    Generates a grounded, auditable explanation and action recommendation.
    Enforces strict hallucination guardrails.
    """
    client = _get_client()

    # Format retrieved evidence text
    evidence_blocks = []
    for idx, ev in enumerate(evidence, start=1):
        source = ev.get("source", "Standard Reference")
        section = ev.get("section", "Clause")
        text_snippet = ev.get("text", "").strip().replace("\n", " ")
        evidence_blocks.append(f"[{idx}] {source} - {section}: \"{text_snippet}\"")

    evidence_context = "\n".join(evidence_blocks) if evidence_blocks else (
        "Authoritative safety evidence unavailable in the current prototype knowledge base."
    )

    hazards_str = ", ".join(precursors.get("hazards", [])) or "Operational hazard"
    barriers_str = ", ".join(precursors.get("barrier_failures", [])) or "No explicit barrier breach identified"
    consequences_str = ", ".join(precursors.get("potential_consequences", [])) or "Workplace injury"

    prompt = f"""
You are an expert Oil & Gas HSE Safety Officer reviewing an operational field incident report for Oil India Limited.

INPUT REPORT:
"{report_text}"

AI CLASSIFIER INFERENCE:
- SIF Potential: {risk_level} (SIF Risk Score: {risk_score}%)
- Applicable Life-Saving Rule: {rule}
- Extracted Hazards: {hazards_str}
- Barrier Failures Identified: {barriers_str}
- Potential Consequences: {consequences_str}

AUTHORITATIVE SAFETY EVIDENCE RETRIEVED VIA RAG:
{evidence_context}

INSTRUCTIONS:
1. Explain in 2-3 professional, direct sentences why this report was assigned a {risk_level} SIF risk rating.
2. Ground all regulatory or procedural statements exclusively in the supplied safety evidence above.
3. Distinguish model inference from authoritative retrieved evidence. If the retrieved evidence is insufficient to verify a policy, state that explicitly.
4. Do not invent standards, section numbers, or external oilfield rules.
5. Provide a 1-sentence concrete, mandated operational recommendation.
6. Note clearly: "AI-generated decision support — HSE review required."

OUTPUT FORMAT:
EXPLANATION: <your grounded explanation>
RECOMMENDATION: <your single sentence recommendation>
"""

    if client:
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )
            raw_text = response.text.strip()
            
            # Parse explanation and recommendation
            explanation = ""
            recommendation = ""
            for line in raw_text.splitlines():
                if line.startswith("EXPLANATION:"):
                    explanation = line.replace("EXPLANATION:", "").strip()
                elif line.startswith("RECOMMENDATION:"):
                    recommendation = line.replace("RECOMMENDATION:", "").strip()
            
            if not explanation:
                explanation = raw_text
            if not recommendation:
                recommendation = f"Immediate HSE supervisor intervention required to verify {rule} compliance before resuming work."

            return {
                "explanation": explanation,
                "recommendation": recommendation,
                "llm_model": GEMINI_MODEL,
                "status": "GENERATED"
            }
        except Exception as e:
            print(f"[LLM] Gemini call note: {e}. Utilizing grounded offline template.")

    # ── Grounded Offline Fallback ──
    # Combines classifier score, extracted barrier failures, and top RAG evidence
    if evidence:
        top_ev = evidence[0]
        ref_text = f"per {top_ev.get('source', 'Safety Standards')} ({top_ev.get('section', 'Guidelines')})"
    else:
        ref_text = "(Authoritative safety evidence unavailable in current prototype knowledge base)"

    offline_explanation = (
        f"This report was evaluated as {risk_level} SIF risk ({risk_score}% SIF Risk Score) due to the presence of "
        f"acute high-energy hazard exposure ({hazards_str}) coupled with critical barrier failures: {barriers_str}. "
        f"Mandatory safety controls require strict compliance with {rule} protocols {ref_text} to avert potential fatality."
    )

    offline_recommendation = (
        f"Immediately halt activity, verify atmospheric test logs and isolation permits with the Site Supervisor, "
        f"and enforce {rule} before work authorization is restored. (AI-generated decision support — HSE review required.)"
    )

    return {
        "explanation": offline_explanation,
        "recommendation": offline_recommendation,
        "llm_model": "grounded-offline-fallback",
        "status": "FALLBACK"
    }


def get_llm_model_name() -> str:
    """Returns active LLM metadata name."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    return GEMINI_MODEL if (genai and api_key) else "grounded-offline-fallback"
