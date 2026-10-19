"""
embeddings.py - Singleton Semantic Embedding Service for SIF-GUARD
Provides ONE shared SentenceTransformer instance reused by all components:
  - Semantic LSR matching (lsr.py)
  - RAG retrieval (rag.py)
  - Similar report retrieval (analysis.py)
  - Pattern clustering (patterns.py)

Thread-safe lazy initialization: model loads once on first use,
never per-request, never duplicated across modules.

CPU-only inference. Outputs compact float32 NumPy arrays.
Tensors are NOT retained after encode() returns.
"""

import os
import gc
import threading
import numpy as np
from typing import List, Union, Optional

_MODEL = None
_MODEL_LOCK = threading.Lock()
_MODEL_NAME = "all-MiniLM-L6-v2"
_EMBEDDING_DIM = 384

# Determine mode: "semantic" (default, all-MiniLM-L6-v2) or "lightweight" (TF-IDF/lexical)
_EMBEDDING_MODE = os.environ.get("EMBEDDING_MODE", "semantic").lower().strip()


class EmbeddingService:
    """
    Singleton Semantic Embedding Service for SIF-GUARD.
    Reused across:
      - Semantic LSR matching (lsr.py)
      - RAG retrieval (rag.py)
      - Similar report lookup (analysis.py)
      - Pattern intelligence clustering (patterns.py)

    CPU-only, single-threaded, inference-only.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._init_service()
        return cls._instance

    def _init_service(self):
        global _MODEL
        self.mode = _EMBEDDING_MODE
        self.model = None

        if self.mode == "lightweight":
            print("[EmbeddingService] Running in LIGHTWEIGHT mode (lexical / TF-IDF similarity).")
            _MODEL = False
            return

        # Semantic mode requested: configure CPU inference environment
        os.environ["OMP_NUM_THREADS"] = "1"
        os.environ["MKL_NUM_THREADS"] = "1"
        os.environ["OPENBLAS_NUM_THREADS"] = "1"
        os.environ["TOKENIZERS_PARALLELISM"] = "false"

        try:
            import torch
            torch.set_num_threads(1)
            try:
                torch.set_num_interop_threads(1)
            except Exception:
                pass
            torch.set_grad_enabled(False)
        except Exception:
            pass

        try:
            from sentence_transformers import SentenceTransformer
            print(f"[EmbeddingService] Loading {_MODEL_NAME} on CPU (single-thread, inference-only)...")
            model = SentenceTransformer(_MODEL_NAME, device="cpu")
            model.eval()
            self.model = model
            _MODEL = model
            # Reclaim transient loading allocations
            gc.collect()
            print(f"[EmbeddingService] {_MODEL_NAME} loaded successfully.")
        except Exception as e:
            print(f"[EmbeddingService] SentenceTransformer unavailable ({e}). Falling back to lightweight mode.")
            self.mode = "lightweight"
            _MODEL = False


def get_embedding_model():
    """
    Thread-safe lazy singleton loader.
    Returns the SentenceTransformer model, or False if in lightweight/fallback mode.
    Loads exactly ONCE — never per request, never duplicated.
    """
    global _MODEL
    if _MODEL is not None:
        return _MODEL

    with _MODEL_LOCK:
        if _MODEL is not None:
            return _MODEL
        service = EmbeddingService()
        _MODEL = service.model if service.model is not None else False
    return _MODEL


def is_model_loaded() -> bool:
    """Returns True ONLY if model is already loaded in memory (zero side-effects)."""
    global _MODEL
    return _MODEL is not None and _MODEL is not False


def is_sentence_transformer_available() -> bool:
    """Returns True if SentenceTransformer model is active and loaded."""
    if _EMBEDDING_MODE == "lightweight":
        return False
    model = get_embedding_model()
    return model is not None and model is not False


def get_embedding_status() -> dict:
    """
    Returns operational status of the embedding infrastructure.
    LIGHTWEIGHT: Does NOT trigger expensive model load if not yet initialized.
    """
    loaded = is_model_loaded()
    mode = _EMBEDDING_MODE
    available = (mode != "lightweight")

    if not available:
        model_name = "lightweight_lexical_fallback"
        status_msg = "Lightweight lexical retrieval mode active (SentenceTransformer disabled)."
    elif loaded:
        model_name = _MODEL_NAME
        status_msg = f"Semantic embedding model active ({_MODEL_NAME})."
    else:
        model_name = _MODEL_NAME
        status_msg = f"Semantic embedding model configured ({_MODEL_NAME}) — loads lazily on first analysis request."

    return {
        "available": available,
        "loaded": loaded,
        "mode": mode,
        "model": model_name,
        "status": status_msg
    }


def _fallback_embed(text: str) -> np.ndarray:
    """
    Deterministic token-frequency hash vector for fallback when
    sentence-transformers is offline.
    NOT labelled as semantic — it is a reproducible lexical approximation.
    """
    if not text or not str(text).strip():
        return np.zeros(_EMBEDDING_DIM, dtype=np.float32)

    vec = np.zeros(_EMBEDDING_DIM, dtype=np.float32)
    tokens = [t.strip().lower() for t in str(text).split() if len(t.strip()) > 1]
    if not tokens:
        return vec

    for tok in tokens:
        idx = abs(hash(tok)) % _EMBEDDING_DIM
        vec[idx] += 1.0

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec


def embed_text(text: str) -> np.ndarray:
    """
    Generates a normalized 1D float32 embedding for a single text.
    Uses the shared singleton model — no new instances created.
    Output is compact float32 NumPy array; no tensors retained.
    """
    if not text or not str(text).strip():
        return np.zeros(_EMBEDDING_DIM, dtype=np.float32)

    model = get_embedding_model()
    if model:
        try:
            # convert_to_numpy=True avoids retaining tensors
            emb = model.encode(
                str(text),
                normalize_embeddings=True,
                show_progress_bar=False,
                convert_to_numpy=True,
            )
            return np.array(emb, dtype=np.float32)
        except Exception as e:
            print(f"[Embeddings] Inference error: {e}. Using fallback.")
            return _fallback_embed(text)
    return _fallback_embed(text)


def embed_documents(documents: List[str]) -> np.ndarray:
    """
    Generates a 2D float32 matrix of normalized embeddings.
    Batch-encodes for efficiency. No tensors retained after return.
    """
    if not documents:
        return np.empty((0, _EMBEDDING_DIM), dtype=np.float32)

    model = get_embedding_model()
    if model:
        try:
            embs = model.encode(
                documents,
                normalize_embeddings=True,
                show_progress_bar=False,
                batch_size=16,
                convert_to_numpy=True,
            )
            return np.array(embs, dtype=np.float32)
        except Exception as e:
            print(f"[Embeddings] Batch inference error: {e}. Using fallback.")
            return np.array([_fallback_embed(doc) for doc in documents], dtype=np.float32)
    return np.array([_fallback_embed(doc) for doc in documents], dtype=np.float32)


def semantic_similarity(text1: str, text2: str) -> float:
    """
    Cosine similarity between two texts using the shared embedding model.
    Falls back to Jaccard overlap (labeled as lexical, not semantic)
    if SentenceTransformer is unavailable.
    """
    if not is_sentence_transformer_available():
        t1_words = set(w.lower() for w in str(text1).split() if len(w) > 2)
        t2_words = set(w.lower() for w in str(text2).split() if len(w) > 2)
        if not t1_words or not t2_words:
            return 0.0
        overlap = len(t1_words.intersection(t2_words))
        jaccard = overlap / float(len(t1_words.union(t2_words)))
        return round(float(jaccard), 4)

    v1 = embed_text(text1)
    v2 = embed_text(text2)
    dot = float(np.dot(v1, v2))
    # Rescale cosine [-1, 1] to [0, 1] for intuitive display
    sim = max(0.0, min(1.0, (dot + 1.0) / 2.0))
    return round(sim, 4)


def get_embedding_model_name() -> str:
    """Returns the identifier of the active embedding architecture."""
    if _EMBEDDING_MODE == "lightweight":
        return "lightweight_lexical_fallback"
    return _MODEL_NAME
