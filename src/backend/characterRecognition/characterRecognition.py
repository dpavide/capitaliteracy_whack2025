import pytesseract as tess
from PIL import Image
import os
import re
from pdf2image import convert_from_path
import glob

SUPPORTED_PATTERNS = [
    "*.png", "*.PNG", "*.jpg", "*.JPG", "*.jpeg", "*.JPEG",
    "*.bmp", "*.BMP", "*.tiff", "*.TIFF", "*.tif", "*.TIF",
    "*.pdf", "*.PDF"
]

def _extract_transactions(text):
    lines = text.split('\n')
    transactions = []
    in_transactions = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Start capturing when we see a date in DD-MM-YYYY or MM-DD-YYYY format at the beginning
        if re.match(r'\d{2}-\d{2}-\d{4}', line):
            in_transactions = True

        # Stop capturing when we hit footer text
        if in_transactions and any(footer in line for footer in ['B.C.P.A.', 'Use the Internet', 'keep track of your Account']):
            break

        if in_transactions:
            transactions.append(line)

    return '\n'.join(transactions)

def process_image_file(image_path):
    """Process a single image file and return extracted text"""
    try:
        img = Image.open(image_path)
        text = tess.image_to_string(img)
        return _extract_transactions(text)
    except Exception as e:
        print(f"Error processing image {image_path}: {str(e)}")
        return ""

def process_pdf_file(pdf_path):
    """Process a single PDF file and return extracted text from all pages"""
    try:
        # Convert PDF to images (pdf2image)
        images = convert_from_path(pdf_path)
        all_text = ""

        for i, image in enumerate(images):
            text = tess.image_to_string(image)
            extracted = _extract_transactions(text)
            if extracted:
                all_text += f"--- Page {i+1} ---\n{extracted}\n\n"

        return all_text.strip()
    except Exception as e:
        print(f"Error processing PDF {pdf_path}: {str(e)}")
        return ""

def _collect_files_from_dir(directory):
    """Collect supported image/pdf files from the directory (case-insensitive)."""
    if not os.path.isdir(directory):
        return []
    files = []
    for pat in SUPPORTED_PATTERNS:
        files.extend(glob.glob(os.path.join(directory, pat)))
    files.sort()
    return files

def _find_candidate_dir(script_directory, target_folder):
    """
    Look for target_folder in a few likely locations and return the first existing path or None.
    This handles cases where this module is placed in a subfolder (e.g. src/backend/characterRecognition)
    but the credit/debit folders are at src/backend/credit or src/backend/debit.
    """
    # Normalize script_directory
    script_directory = os.path.abspath(script_directory)

    # Build a list of plausible candidate directories (ordered by priority)
    candidates = []

    # 1) If the script is in src/backend or one of its subfolders, check sibling credit/debit
    #    - script_directory/target_folder (script in src/backend)
    candidates.append(os.path.join(script_directory, target_folder))
    #    - parent_of_script/target_folder (script in src/backend/characterRecognition => parent is src/backend)
    candidates.append(os.path.join(script_directory, "..", target_folder))
    #    - two levels up (in case script is deeper)
    candidates.append(os.path.join(script_directory, "..", "..", target_folder))

    # 2) Common project-root-based locations
    #    - repo-root/src/backend/target_folder (assume script is somewhere under repo)
    candidates.append(os.path.join(script_directory, "..", "src", "backend", target_folder))
    candidates.append(os.path.join(script_directory, "..", "..", "src", "backend", target_folder))

    # 3) Current working directory variants (when running from project root)
    candidates.append(os.path.join(os.getcwd(), "src", "backend", target_folder))
    candidates.append(os.path.join(os.getcwd(), target_folder))

    # 4) Finally, absolute path if someone passed an absolute-like folder name
    candidates.append(target_folder)

    # Normalize and return the first candidate that exists as a directory
    tried = []
    for c in candidates:
        norm = os.path.normpath(os.path.abspath(c))
        tried.append(norm)
        if os.path.isdir(norm):
            # Return the absolute normalized directory
            return norm

    # For debugging, show what we tried (but do not raise)
    print(f"Debug: _find_candidate_dir tried these locations for '{target_folder}':")
    for t in tried:
        print(f"  - {t}")

    return None

def character_recognition():
    """
    Main function to process files in the credit/ and debit/ folders (searching likely locations).
    Returns a dict mapping keys "<folder>/<filename>" -> extracted_text
    Example keys: "credit/statement1.pdf", "debit/photo1.png"
    """
    script_directory = os.path.dirname(os.path.abspath(__file__))

    # Try to find usable credit/debit directories (search likely places including src/backend/credit)
    credit_dir = _find_candidate_dir(script_directory, "credit")
    debit_dir = _find_candidate_dir(script_directory, "debit")

    print(f"Debug: resolved credit_dir -> {credit_dir}")
    print(f"Debug: resolved debit_dir  -> {debit_dir}")

    # Gather files from whatever directories exist (credit and debit only)
    sources = []  # list of (folder_label, fullpath)
    if credit_dir:
        credit_files = _collect_files_from_dir(credit_dir)
        for f in credit_files:
            sources.append(("credit", f))
    else:
        print("Warning: credit directory not found in searched locations.")

    if debit_dir:
        debit_files = _collect_files_from_dir(debit_dir)
        for f in debit_files:
            sources.append(("debit", f))
    else:
        print("Warning: debit directory not found in searched locations.")

    # Only show "no files" if both directories didn't yield any supported files
    if not sources:
        print("No image or PDF files found in the credit/ or debit/ folders (after checking likely locations).")
        return {}

    results = {}
    for folder_label, file_path in sources:
        filename = os.path.basename(file_path)
        key = f"{folder_label}/{filename}"
        print(f"Processing: {key}")

        file_ext = os.path.splitext(file_path)[1].lower()
        raw_text = ""
        try:
            if file_ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']:
                raw_text = process_image_file(file_path)
            elif file_ext == '.pdf':
                raw_text = process_pdf_file(file_path)
            else:
                print(f"Unsupported file type: {file_path}")
                raw_text = ""

            results[key] = raw_text if raw_text else ""
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            results[key] = ""

    return results

def character_recognition_single(image_name="image.png", folder="credit"):
    """
    Process a single image or PDF file (backward compatibility).
    folder is 'credit' or 'debit' (we search for the best matching folder location).
    """
    script_directory = os.path.dirname(os.path.abspath(__file__))
    resolved_dir = _find_candidate_dir(script_directory, folder)

    if not resolved_dir:
        print(f"Folder '{folder}' not found in searched locations.")
        return ""

    img_path = os.path.join(resolved_dir, image_name)

    if os.path.exists(img_path):
        file_ext = os.path.splitext(img_path)[1].lower()
        if file_ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']:
            return process_image_file(img_path)
        elif file_ext == '.pdf':
            return process_pdf_file(img_path)
        else:
            print(f"Unsupported file type: {img_path}")
            return ""
    else:
        print(f"Image file not found: {img_path}")
        return ""
