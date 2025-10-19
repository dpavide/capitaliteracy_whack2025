import os
import uuid
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Import your pipeline function (make sure text_to_json.py is in same project & importable)
# from text_to_json import run_json_text
# If text_to_json.py is not in same package, adjust import accordingly.
try:
    from text_to_json import run_json_text
except Exception as e:
    # If you get an import error, run the app anyway but /api/process will return an error referencing this.
    run_json_text = None
    print("Warning: could not import run_json_text from text_to_json.py:", e)

# Configuration
BASE_DIR = Path(__file__).resolve().parent
CREDIT_DIR = BASE_DIR / "credit"    # NOTE: text_to_json expects "credit" & "debit"
DEBIT_DIR = BASE_DIR / "debit"
OUTPUT_DIR = BASE_DIR / "output"

# Ensure directories exist
CREDIT_DIR.mkdir(parents=True, exist_ok=True)
DEBIT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf"}
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

app = Flask(__name__)
CORS(app)  # allow all origins by default; restrict if you want (e.g. CORS(app, origins=["http://localhost:3000"]))

# limit request payload (this is global request size; still check per-file too)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024 * 1024  # 2GB global safe limit (adjust as needed)


def allowed_file(filename):
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def save_file(file_storage, folder: Path):
    """Saves file with a secure and unique name. Returns saved filename and path."""
    original = secure_filename(file_storage.filename)
    uid = f"{int(__import__('time').time() * 1000)}-{uuid.uuid4().hex[:8]}"
    saved_name = f"{uid}-{original}"
    saved_path = folder / saved_name
    file_storage.save(saved_path)
    return saved_name, str(saved_path)


def validate_file_storage(file_storage):
    """Validate file type and size from a werkzeug FileStorage."""
    if not file_storage:
        return "No file provided"
    filename = file_storage.filename
    if filename == "":
        return "No file selected"

    if not allowed_file(filename):
        return f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    # file_storage.stream may be seeked to get size; safer to check Content-Length header
    # But we can temporarily get size by reading stream length if necessary.
    # Here we rely on file_storage.content_length if present:
    content_length = getattr(file_storage, "content_length", None)
    if content_length is None:
        # attempt to determine size by seeking (works for small files)
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
        file = request.files.get("file")
        err = validate_file_storage(file)
        if err:
            return jsonify({"error": err}), 400

        saved_name, saved_path = save_file(file, CREDIT_DIR)
        return jsonify({
            "message": "Credit statement uploaded successfully",
            "filename": saved_name,
            "path": saved_path,
            "size": os.path.getsize(saved_path)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload/debit", methods=["POST"])
def upload_debit():
    try:
        file = request.files.get("file")
        err = validate_file_storage(file)
        if err:
            return jsonify({"error": err}), 400

        saved_name, saved_path = save_file(file, DEBIT_DIR)
        return jsonify({
            "message": "Debit statement uploaded successfully",
            "filename": saved_name,
            "path": saved_path,
            "size": os.path.getsize(saved_path)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Delete endpoints
@app.route("/api/upload/credit/<filename>", methods=["DELETE"])
def delete_credit(filename):
    try:
        safe = secure_filename(filename)
        target = CREDIT_DIR / safe
        if not target.exists():
            return jsonify({"error": "File not found"}), 404
        target.unlink()
        return jsonify({"message": "Credit statement deleted successfully", "filename": safe}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload/debit/<filename>", methods=["DELETE"])
def delete_debit(filename):
    try:
        safe = secure_filename(filename)
        target = DEBIT_DIR / safe
        if not target.exists():
            return jsonify({"error": "File not found"}), 404
        target.unlink()
        return jsonify({"message": "Debit statement deleted successfully", "filename": safe}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Optional: serve uploaded files (for debugging). In production, serve via static storage
@app.route("/uploads/credit/<filename>", methods=["GET"])
def serve_credit(filename):
    return send_from_directory(CREDIT_DIR, secure_filename(filename), as_attachment=False)


@app.route("/uploads/debit/<filename>", methods=["GET"])
def serve_debit(filename):
    return send_from_directory(DEBIT_DIR, secure_filename(filename), as_attachment=False)


# Process endpoint - runs your text_to_json pipeline immediately and returns results summary
@app.route("/api/process", methods=["POST"])
def process_all():
    if run_json_text is None:
        return jsonify({"error": "Processing function not available. Make sure text_to_json.py is importable."}), 500

    try:
        # Create a job id (for tracking in client)
        job_id = uuid.uuid4().hex

        # Run the pipeline synchronously (the script writes outputs to ./output/)
        combined_output = run_json_text()

        # Try to compute some summary data to return immediately
        summary = combined_output.get("summary", {}) if isinstance(combined_output, dict) else {}
        # Provide output file path(s) so client can fetch them if needed
        output_path = str(OUTPUT_DIR / "all_transactions.json")
        per_file_path = str(OUTPUT_DIR / "per_file_results.json")

        return jsonify({
            "jobId": job_id,
            "status": "completed",
            "summary": summary,
            "files": {
                "combined": output_path,
                "per_file": per_file_path
            }
        }), 200
    except Exception as e:
        return jsonify({"jobId": None, "status": "error", "error": str(e)}), 500


if __name__ == "__main__":
    # default port 3001 to match your Node server (change with env PORT if needed)
    import os
    port = int(os.environ.get("PORT", "3001"))
    app.run(host="0.0.0.0", port=port, debug=True)
