# app.py
import os
import uuid
import json
import threading
import traceback
from pathlib import Path
from time import time
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import queue  # use the queue module directly

# Try to import your pipeline function
try:
    from text_to_json import run_json_text
except Exception as e:
    run_json_text = None
    print("Warning: couldn't import run_json_text():", e)

BASE_DIR = Path(__file__).resolve().parent
CREDIT_DIR = BASE_DIR / "credit"
DEBIT_DIR = BASE_DIR / "debit"
OUTPUT_DIR = BASE_DIR / "output"

CREDIT_DIR.mkdir(parents=True, exist_ok=True)
DEBIT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf"}
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100MB

app = Flask(__name__)
# Allow the Vite dev server origin (adjust if you host frontend elsewhere)
CORS(app, origins=["http://localhost:5173"])

# In-memory job store
_jobs = {}  # jobid -> {status, queue (for SSE messages), result, error, started_at, finished_at}
_jobs_lock = threading.Lock()


def allowed_file(fname: str):
    ext = Path(fname).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def save_file(file_storage, dest_folder: Path):
    orig = secure_filename(file_storage.filename)
    uid = f"{int(time()*1000)}-{uuid.uuid4().hex[:8]}"
    saved_name = f"{uid}-{orig}"
    saved_path = dest_folder / saved_name
    file_storage.save(saved_path)
    return saved_name, str(saved_path)


def validate_file_storage(file_storage):
    if not file_storage:
        return "No file provided"
    if file_storage.filename == "":
        return "No file selected"
    if not allowed_file(file_storage.filename):
        return f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    # try to get size
    content_length = getattr(file_storage, "content_length", None)
    if content_length is None:
        try:
            pos = file_storage.stream.tell()
            file_storage.stream.seek(0, os.SEEK_END)
            size = file_storage.stream.tell()
            file_storage.stream.seek(pos)
        except Exception:
            size = None
    else:
        size = content_length
    if size is not None and size > MAX_FILE_SIZE_BYTES:
        return f"File exceeds max size of {MAX_FILE_SIZE_BYTES} bytes"
    return None


# Upload endpoints
@app.route("/api/upload/credit", methods=["POST"])
def upload_credit():
    try:
        f = request.files.get("file")
        err = validate_file_storage(f)
        if err:
            return jsonify({"error": err}), 400
        name, path = save_file(f, CREDIT_DIR)
        return jsonify({"message": "Credit statement uploaded successfully", "filename": name, "path": path, "size": os.path.getsize(path)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload/debit", methods=["POST"])
def upload_debit():
    try:
        f = request.files.get("file")
        err = validate_file_storage(f)
        if err:
            return jsonify({"error": err}), 400
        name, path = save_file(f, DEBIT_DIR)
        return jsonify({"message": "Debit statement uploaded successfully", "filename": name, "path": path, "size": os.path.getsize(path)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Delete endpoints
@app.route("/api/upload/credit/<filename>", methods=["DELETE"])
def delete_credit(filename):
    try:
        safe = secure_filename(filename)
        t = CREDIT_DIR / safe
        if not t.exists():
            return jsonify({"error": "File not found"}), 404
        t.unlink()
        return jsonify({"message": "Credit statement deleted successfully", "filename": safe}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload/debit/<filename>", methods=["DELETE"])
def delete_debit(filename):
    try:
        safe = secure_filename(filename)
        t = DEBIT_DIR / safe
        if not t.exists():
            return jsonify({"error": "File not found"}), 404
        t.unlink()
        return jsonify({"message": "Debit statement deleted successfully", "filename": safe}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Serve resulting JSONs (optional)
@app.route("/api/output/<path:filename>", methods=["GET"])
def serve_output(filename):
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=False)


# Start processing job in background
def _start_processing_job(jobid):
    """
    This function runs in a background thread and updates the job record.
    It pushes messages to the SSE queue for the job, and updates status/result.
    """
    q = _jobs[jobid]["queue"]
    try:
        # notify started
        q.put({"event": "started", "message": "Processing started"})
        _jobs[jobid]["status"] = "started"
        _jobs[jobid]["started_at"] = time()

        if run_json_text is None:
            raise RuntimeError("run_json_text is not importable. Ensure text_to_json.py is present and importable.")

        # Run pipeline (synchronously). If this raises, will go to except block.
        combined = run_json_text()

        # Save summary + file paths
        summary = combined.get("summary", {}) if isinstance(combined, dict) else {}
        combined_path = str(OUTPUT_DIR / "all_transactions.json")
        per_file_path = str(OUTPUT_DIR / "per_file_results.json")

        _jobs[jobid]["status"] = "completed"
        _jobs[jobid]["finished_at"] = time()
        _jobs[jobid]["result"] = {"summary": summary, "combined": combined_path, "per_file": per_file_path}

        q.put({"event": "completed", "result": _jobs[jobid]["result"]})
    except Exception as exc:
        tb = traceback.format_exc()
        _jobs[jobid]["status"] = "error"
        _jobs[jobid]["error"] = str(exc)
        _jobs[jobid]["traceback"] = tb
        _jobs[jobid]["finished_at"] = time()
        q.put({"event": "error", "error": str(exc), "traceback": tb})


# Process endpoint — starts background job and returns jobId immediately
@app.route("/api/process", methods=["POST"])
def process_all():
    if run_json_text is None:
        return jsonify({"error": "Processing function not available (text_to_json import failed on server)."}), 500

    # create job
    jobid = uuid.uuid4().hex
    q = queue.Queue()
    with _jobs_lock:
        _jobs[jobid] = {"status": "pending", "queue": q, "created_at": time(), "result": None, "error": None}
    # spawn thread
    t = threading.Thread(target=_start_processing_job, args=(jobid,), daemon=True)
    t.start()
    return jsonify({"jobId": jobid, "status": "started"}), 200


# SSE endpoint that streams job messages
@app.route("/api/stream/<jobid>")
def stream_job(jobid):
    if jobid not in _jobs:
        return jsonify({"error": "Job not found"}), 404

    def event_stream():
        q = _jobs[jobid]["queue"]
        # Send current status immediately as an SSE 'status' event
        try:
            status_payload = {"status": _jobs[jobid]["status"]}
            yield f"event: status\ndata: {json.dumps(status_payload)}\n\n"
        except Exception:
            # if something goes wrong serializing, still continue to stream queued items
            pass

        # Now stream new messages until job finished (or forever while alive)
        while True:
            try:
                msg = q.get(timeout=0.5)  # waits briefly, allows checking if finished
                # Expect msg to be a dict with an "event" key
                event_name = msg.get("event", "message")
                # Send the event name and the JSON payload
                yield f"event: {event_name}\ndata: {json.dumps(msg)}\n\n"
                # If job ended, break
                if event_name in ("completed", "error"):
                    break
            except queue.Empty:
                # if job already finished but queue drained, break
                status = _jobs[jobid]["status"]
                if status in ("completed", "error"):
                    break
                continue
            except GeneratorExit:
                break
            except Exception as exc:
                # In case of unexpected serialization errors, notify client and break
                try:
                    yield f"event: error\ndata: {json.dumps({'event': 'error', 'error': str(exc)})}\n\n"
                except Exception:
                    yield f"event: error\ndata: {json.dumps({'event': 'error', 'error': 'unknown serialization error'})}\n\n"
                break

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no"  # for nginx proxy (disable buffering)
    }
    return Response(event_stream(), headers=headers)


# Polling endpoint (fallback if SSE cannot be used)
@app.route("/api/result/<jobid>", methods=["GET"])
def result(jobid):
    if jobid not in _jobs:
        return jsonify({"error": "Job not found"}), 404
    rec = _jobs[jobid]
    return jsonify({
        "status": rec.get("status"),
        "result": rec.get("result"),
        "error": rec.get("error")
    }), 200


if __name__ == "__main__":
    # Run flask on port 3001 (your frontend on 5173 will call it)
    port = int(os.environ.get("PORT", "3001"))
    app.run(host="0.0.0.0", port=port, debug=True)
