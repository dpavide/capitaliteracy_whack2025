import json
import sys
import traceback
import pathlib

# Ensure src/ is on sys.path so we can import the existing module
ROOT = pathlib.Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

def main():
    try:
        # import the module that contains character_recognition()
        from backend.characterRecognition import characterRecognition as cr
    except Exception:
        print(json.dumps({"ok": False, "error": "import_failed", "trace": traceback.format_exc()}))
        return 2

    try:
        results = cr.character_recognition()
        print(json.dumps({"ok": True, "results": results}))
        return 0
    except Exception:
        print(json.dumps({"ok": False, "error": "processing_failed", "trace": traceback.format_exc()}))
        return 3

if __name__ == "__main__":
    code = main()
    sys.exit(code)