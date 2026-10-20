"""
jobs.py - Lightweight Asynchronous Batch Job Processing Worker
Enables asynchronous large-file and multi-report processing in chunks without external message brokers.
States: UPLOADED, QUEUED, PROCESSING, COMPLETED, FAILED, PARTIALLY_COMPLETED.
"""

import uuid
import time
import threading
from typing import Dict, List, Any, Optional

_JOBS: Dict[str, Dict[str, Any]] = {}
_LOCK = threading.Lock()


def create_batch_job(reports: List[Dict[str, Any]]) -> str:
    """Initializes a new batch processing job and spawns a background thread."""
    from ai.analysis import analyze_full_pipeline

    job_id = str(uuid.uuid4())[:8]
    total = len(reports)

    with _LOCK:
        _JOBS[job_id] = {
            "job_id": job_id,
            "status": "QUEUED",
            "total": total,
            "processed": 0,
            "failed": 0,
            "progress": 0.0,
            "results": [],
            "created_at": time.time(),
            "completed_at": None
        }

    def _worker():
        with _LOCK:
            if job_id in _JOBS:
                _JOBS[job_id]["status"] = "PROCESSING"

        results = []
        failed_count = 0

        for idx, item in enumerate(reports, start=1):
            text = item.get("text", "") or item.get("report_text", "")
            try:
                res = analyze_full_pipeline(text)
                results.append({
                    "report_id": item.get("report_id", f"BATCH-{idx}"),
                    "result": res
                })
            except Exception as e:
                failed_count += 1
                results.append({
                    "report_id": item.get("report_id", f"BATCH-{idx}"),
                    "error": str(e)
                })

            with _LOCK:
                if job_id in _JOBS:
                    _JOBS[job_id]["processed"] = idx
                    _JOBS[job_id]["failed"] = failed_count
                    _JOBS[job_id]["progress"] = round((idx / total) * 100.0, 1)

        with _LOCK:
            if job_id in _JOBS:
                if failed_count == total and total > 0:
                    _JOBS[job_id]["status"] = "FAILED"
                elif failed_count > 0:
                    _JOBS[job_id]["status"] = "PARTIALLY_COMPLETED"
                else:
                    _JOBS[job_id]["status"] = "COMPLETED"
                _JOBS[job_id]["results"] = results
                _JOBS[job_id]["completed_at"] = time.time()

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()

    return job_id


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Fetches current job progress and results."""
    with _LOCK:
        job = _JOBS.get(job_id)
        if not job:
            return None
        return dict(job)
