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
import google.generativeai as genai
from dotenv import load_dotenv


# Load environment variables
load_dotenv()

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("⚠️ Warning: GEMINI_API_KEY not found in .env file")


# Try to import your pipeline function
try:
    from text_to_json import run_json_text
except Exception as e:
    run_json_text = None
    print("Warning: couldn't import run_json_text():", e)

# Try to import find_percentages if available
try:
    # user code previously referenced characterRecognition.find_percentages
    # Try both local and package import names (robust)
    try:
        from characterRecognition.find_percentages import find_percentages
    except Exception:
        from find_percentages import find_percentages
except Exception:
    find_percentages = None

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
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
])

# In-memory job store
_jobs = {}  # jobid -> {status, queue (for SSE messages), result, error, started_at, finished_at}
_jobs_lock = threading.Lock()

# ------------------------------------------------------------------
# New: simple in-memory storage for posted "percentages" data
# ------------------------------------------------------------------
# Structure:
#   LATEST_PERCENTAGES = { "jobId": "...", "percentages": {...} | [ {name,percentage} ], "received_at": timestamp }
#   PERCENTAGES_BY_JOB = jobId -> same payload
LATEST_PERCENTAGES = None
PERCENTAGES_BY_JOB = {}
PERCENTAGES_LOCK = threading.Lock()


@app.route("/api/spending", methods=["POST"])
def post_spending():
    """
    Accept JSON:
    {
      "jobId": "optional",
      "percentages": { "Rent": 30, "Food": 20, ... }   OR
      "percentages": [ {"name": "...", "percentage": 30}, ... ]
    }
    Stores it as the latest and by jobId (if provided).
    """
    global LATEST_PERCENTAGES, PERCENTAGES_BY_JOB
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    if not payload or "percentages" not in payload:
        return jsonify({"error": "Missing 'percentages' field"}), 400

    jobid = payload.get("jobId") or uuid.uuid4().hex
    percentages = payload["percentages"]
    now = time()

    rec = {"jobId": jobid, "percentages": percentages, "received_at": now}

    with PERCENTAGES_LOCK:
        LATEST_PERCENTAGES = rec
        PERCENTAGES_BY_JOB[jobid] = rec

    return jsonify({"message": "Percentages stored", "jobId": jobid}), 200


@app.route("/api/spending/latest", methods=["GET"])
def get_spending_latest():
    """
    Return the last posted percentages (or 404 if none).
    """
    with PERCENTAGES_LOCK:
        if LATEST_PERCENTAGES is None:
            return jsonify({"error": "No data yet"}), 404
        return jsonify(LATEST_PERCENTAGES), 200


@app.route("/api/spending/<jobid>", methods=["GET"])
def get_spending_by_job(jobid):
    with PERCENTAGES_LOCK:
        rec = PERCENTAGES_BY_JOB.get(jobid)
        if rec is None:
            return jsonify({"error": "Not found"}), 404
        return jsonify(rec), 200
    
@app.route("/api/chat", methods=["POST"])
def chatbot_reply():
    """
    Chatbot endpoint powered by Gemini.
    Expects JSON: { "message": "user's input" }
    Returns: { "reply": "AI-generated text" }
    """
    try:
        data = request.get_json()
        msg = data.get("message", "").strip()

        user_past_data = """
{
  "transactions": [
    {
      "date-of-transaction": "",
      "amount": "2150.00",
      "company-type": "Opening Balance",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "",
      "amount": "2150.00",
      "company-type": "Opening Balance",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "",
      "amount": "2150.00",
      "company-type": "Opening Balance",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "",
      "amount": "3200.00",
      "company-type": "Opening Balance",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-02-2025",
      "amount": "245.99",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-02-2025",
      "amount": "245.99",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-02-2025",
      "amount": "245.99",
      "company-type": "Shopping",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-03-2025",
      "amount": "189.50",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-03-2025",
      "amount": "189.50",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-03-2025",
      "amount": "189.50",
      "company-type": "Shopping",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-03-2025",
      "amount": "1402.13",
      "company-type": "Recurring Debts",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-04-2025",
      "amount": "45.00",
      "company-type": "Everything Else",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-04-2025",
      "amount": "45.00",
      "company-type": "Everything Else",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-04-2025",
      "amount": "45.00",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-04-2025",
      "amount": "92.45",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-05-2025",
      "amount": "67.25",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-05-2025",
      "amount": "67.25",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-05-2025",
      "amount": "67.25",
      "company-type": "Shopping",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-05-2025",
      "amount": "4.95",
      "company-type": "Eating Out",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-06-2025",
      "amount": "8.75",
      "company-type": "Eating Out",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-06-2025",
      "amount": "8.75",
      "company-type": "Eating Out",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-06-2025",
      "amount": "8.75",
      "company-type": "Eating Out",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-06-2025",
      "amount": "60.00",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-07-2025",
      "amount": "2000.00",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-08-2025",
      "amount": "132.40",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-08-2025",
      "amount": "132.40",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-08-2025",
      "amount": "132.40",
      "company-type": "Shopping",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-09-2025",
      "amount": "34.50",
      "company-type": "Eating Out",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-09-2025",
      "amount": "34.50",
      "company-type": "Eating Out",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-09-2025",
      "amount": "34.50",
      "company-type": "Eating Out",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-09-2025",
      "amount": "85.60",
      "company-type": "Bills",
      "card-type": "debit"
    },
    {
      "date-of-transaction": "01-10-2025",
      "amount": "2.99",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-10-2025",
      "amount": "2.99",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-of-transaction": "01-10-2025",
      "amount": "2.99",
      "company-type": "Shopping",
      "card-type": "debit"
    },]
"""

        if not msg:
            return jsonify({"reply": "Please enter a message."}), 400

        # Initialize Gemini model
        model = genai.GenerativeModel("gemini-2.5-flash")

        age = 25
        credit_score = 550
        numerical_level = "medium"

        # Give Gemini some context about the financial app
        prompt = f"""
        Do no say Bot: You are an my professional financial assistant you are composed and always speek full sentences integrated into a user's spending dashboard.
        You help users analyze their spending, categories, and financial goals.
        
        The user is {age} years old
        They have a credit score of {credit_score}
        They have a numerical_level of {numerical_level}

        Here is some past data {user_past_data}

        LIMIT TO 5 SENTENCES MAX!!

        User message: {msg}
        """

        # Generate response
        response = model.generate_content(prompt)
        reply_text = response.text.strip() if hasattr(response, "text") else "Sorry, I couldn't generate a reply."

        return jsonify({"reply": reply_text})

    except Exception as e:
        print("Chatbot error:", e)
        traceback.print_exc()
        return jsonify({"reply": "Something went wrong connecting to Gemini."}), 500



# ------------------------------------------------------------------
# End of added endpoints
# ------------------------------------------------------------------


def allowed_file(fname: str):
    ext = Path(fname).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def save_file(file_storage, dest_folder: Path):
    orig = secure_filename(file_storage.filename)
    uid = f"{int(time() * 1000)}-{uuid.uuid4().hex[:8]}"
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
        return jsonify({"message": "Credit statement uploaded successfully", "filename": name, "path": path,
                        "size": os.path.getsize(path)}), 200
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
        return jsonify({"message": "Debit statement uploaded successfully", "filename": name, "path": path,
                        "size": os.path.getsize(path)}), 200
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


def _try_load_percentages_from_files():
    """
    Try read JSON percentages from well-known files:
      - output/category_percentages.json
      - output/category_percentages.json (other variants)
      - output/categories/*.json (construct if necessary)
    Returns either a list of {"name", "percentage"} or a mapping name->percentage, or None
    """
    candidates = [
        OUTPUT_DIR / "category_percentages.json",
        OUTPUT_DIR / "category_percentages.json",
        OUTPUT_DIR / "category_percentages.json",
        BASE_DIR / "output" / "category_percentages.json",
        BASE_DIR / "backend" / "characterRecognition" / "output" / "category_percentages.json",
        BASE_DIR / "backend" / "characterRecognition" / "output" / "category_percentages.json",
    ]
    for p in candidates:
        try:
            if p and p.exists():
                with open(p, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                return data
        except Exception:
            continue
    return None


def _store_percentages_for_job(jobid: str, percentages):
    """
    percentages may be:
      - dict: name -> numeric
      - list of {name, percentage}
    This function stores the payload in LATEST_PERCENTAGES and PERCENTAGES_BY_JOB.
    """
    global LATEST_PERCENTAGES, PERCENTAGES_BY_JOB
    now = time()
    rec = {"jobId": jobid, "percentages": percentages, "received_at": now}
    with PERCENTAGES_LOCK:
        LATEST_PERCENTAGES = rec
        PERCENTAGES_BY_JOB[jobid] = rec


# Start processing job in background
def _start_processing_job(jobid):
    """
    This function runs in a background thread and updates the job record.
    It pushes messages to the SSE queue for the job, and updates status/result.
    After the pipeline completes, it tries to compute/find category percentages and store them.
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

        # Save summary + file paths (attempt to save outputs if run_json_text wrote them)
        summary = combined.get("summary", {}) if isinstance(combined, dict) else {}
        combined_path = str(OUTPUT_DIR / "all_transactions.json")
        per_file_path = str(OUTPUT_DIR / "per_file_results.json")

        # Mark job completed for primary pipeline
        _jobs[jobid]["status"] = "completed"
        _jobs[jobid]["finished_at"] = time()
        _jobs[jobid]["result"] = {"summary": summary, "combined": combined_path, "per_file": per_file_path}

        q.put({"event": "completed", "result": _jobs[jobid]["result"]})

        # --- NEW: try to compute/find percentages and store them for frontend ---
        percentages_payload = None

        # 1) If a find_percentages function is available, try to call it.
        if find_percentages is not None:
            try:
                # try calling with no args (some implementations export a convenience function)
                try:
                    res = find_percentages()
                except TypeError:
                    # try calling with helpful defaults (paths similar to the CLI defaults used in your module)
                    candidate_paths = [
                        str(OUTPUT_DIR / "all_transactions.json"),
                        str(BASE_DIR / "backend" / "characterRecognition" / "output" / "all_transactions.json"),
                        str(BASE_DIR / "output" / "all_transactions.json"),
                    ]
                    categories_dir = str(OUTPUT_DIR / "categories")
                    out_path = str(OUTPUT_DIR / "category_percentages.json")
                    res = find_percentages(candidate_paths, categories_dir, out_path)
                # if res looks like a list/dict - accept it
                if isinstance(res, (list, dict)):
                    percentages_payload = res
            except Exception as exc:
                # ignore but log to queue
                tb = traceback.format_exc()
                q.put({"event": "warning", "message": f"find_percentages() call failed: {exc}", "traceback": tb})

        # 2) If still None, try reading common output JSON files
        if percentages_payload is None:
            try:
                loaded = _try_load_percentages_from_files()
                if loaded is not None:
                    percentages_payload = loaded
            except Exception:
                pass

        # 3) If still None -> fallback attempt from combined all_transactions.json (very coarse)
        if percentages_payload is None:
            try:
                # try to read OUTPUT_DIR / per-category files under OUTPUT_DIR / categories
                cat_dir = OUTPUT_DIR / "categories"
                if cat_dir.exists() and cat_dir.is_dir():
                    # try to read each json file and compute simple money_in sum -> percentages
                    cat_files = sorted([p for p in cat_dir.glob("*.json")])
                    # naive sum
                    sums = {}
                    total = 0.0
                    for cf in cat_files:
                        try:
                            with open(cf, "r", encoding="utf-8") as fh:
                                obj = json.load(fh)
                            # try a few fields
                            amount = None
                            if isinstance(obj, dict):
                                if "summary" in obj and isinstance(obj["summary"], dict) and "money_in" in obj["summary"]:
                                    amount = obj["summary"]["money_in"]
                                elif "money_in" in obj:
                                    amount = obj["money_in"]
                            if amount is None:
                                # skip
                                amount = 0
                            try:
                                num = float(amount)
                            except Exception:
                                num = 0.0
                            name = obj.get("category") if isinstance(obj, dict) else cf.stem
                            name = name or cf.stem
                            sums[name] = sums.get(name, 0.0) + num
                            total += num
                        except Exception:
                            continue
                    if total > 0 and sums:
                        # build percentages list
                        payload_list = []
                        for k, v in sums.items():
                            payload_list.append({"name": k, "percentage": int(round((v / total) * 100))})
                        percentages_payload = payload_list
                else:
                    # try reading combined all_transactions.json and produce an "everything else" placeholder
                    at = OUTPUT_DIR / "all_transactions.json"
                    if at.exists():
                        # as a last resort, return empty/zero percentages
                        percentages_payload = []
            except Exception:
                percentages_payload = None

        # If we did find percentages, store them so /api/spending/latest returns them
        if percentages_payload is not None:
            _store_percentages_for_job(jobid, percentages_payload)
            q.put({"event": "percentages_stored", "message": "Category percentages were found and stored", "payload_summary": (percentages_payload if isinstance(percentages_payload, list) and len(percentages_payload) < 50 else "large")})

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
