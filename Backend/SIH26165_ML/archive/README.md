# Archived Legacy Pipeline

This directory contains deprecated, early prototype scripts and the obsolete Streamlit prototype:
- `app.py`: Obsolete Streamlit user interface featuring deprecated static benchmark metrics (such as the fixed 22.4% pSIF ratio, 14 Tank Farm B precursors, and 9 No Energy Isolation incidents).
- `step1_create_dataset.py` to `step5_predict.py`: Early sequential script pipeline, replaced by the modular `ai/` package.
- `add_columns.py`: Early data restructuring utility.

## Canonical Production Prototype
The official and canonical backend architecture for SIF-GUARD (SIH26165) is:
- **`server.py`**: Production Flask REST API (`/api/analyze`, `/api/overview`, `/api/patterns`, `/api/reviews`, `/api/health`).
- **`ai/` Package**: Modular, explainable AI safety intelligence engine:
  - `ai/analysis.py`: Master analysis orchestrator
  - `ai/classifier.py`: Leakage-free TF-IDF + domain feature classifier
  - `ai/embeddings.py`: Sentence Transformers (`all-MiniLM-L6-v2`) with keyword-based fallback
  - `ai/extraction.py`: Structured precursor factor extractor
  - `ai/rag.py`: Knowledge base retrieval with explicit degraded status reporting
  - `ai/lsr.py`: IOGP-aligned Life-Saving Rule mapping
  - `ai/hitl.py`: Human-in-the-Loop review persistence and adjudication
  - `ai/patterns.py`: Semantic clustering and pattern discovery
