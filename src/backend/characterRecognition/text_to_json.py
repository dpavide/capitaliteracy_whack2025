"""
text_to_json.py

Merged module combining characterRecognition and the transaction parsing/JSON export logic.

Usage:
  - Ensure pytesseract, pillow, pdf2image are installed and configured.
  - Ensure dataset.company_to_type (companies dict) exists and is importable.
  - Run directly: python text_to_json.py
  - Or import run_json_text() from this module.

Outputs:
  - Per-file JSON results in ./output/
  - Combined results in ./output/all_transactions.json
  - Category files in ./output/categories/
"""

import os
import re
import glob
import json
from datetime import datetime

# OCR + image/pdf handling
import pytesseract as tess
from PIL import Image
from pdf2image import convert_from_path

companies = {
    "Best Embarcadero Parking": "Everything Else",
    "AIG Insurance Adjustment 20-21": "Everything Else",
    "\u2018Ferry Building Marketplace": "Shopping",
    "Ferry Building Marketplace": "Shopping",
    "76 Fuel 1150 Embarcadero": "Everything Else",
    "Trello Subscripton": "Entertainment",
    "ATM Embarcadero Center": "Everything Else",
    "Blue Bottle Cofee": "Eating Out",
    "Docmosis Subscription": "Entertainment",
    "Embarcadero Centre Postage": "Everything Else",
    "Bill Payment - Silicon Valley Graphic": "Bills",
    "Bill Payment - Electricity": "Bills",
    "Dividend Share - McDonalds Corp": "Everything Else",
    "_ Internet Transfer": "Everything Else",
    "Opening Balance": "Opening Balance",
    "Bus Ticket": "Travel",
    "McDonalds": "Eating Out",
    "H&M": "Shopping",
    "Parents": "Everything Else",
    "ATM Withdrawal": "Everything Else",
    "Starbucks": "Eating Out",
    "WHSmiths": "Shopping",
    "Steam": "Entertainment",
    "Vue": "Entertainment",
    "Uniqlo": "Shopping",
    "Bus": "Travel",
    "Phone Top-up": "Bills",
    "Subway": "Eating Out",
    "Amazon": "Shopping",
    "Car Loan Payment": "Recurring debts",
    "eBay": "Shopping",
    "Bistro": "Eating Out",
    "Waitrose": "Shopping",
    "Boots Pharmacy": "Shopping",
    "Interest Charge": "Recurring debts",
    "Payment Received": "Everything Else",
    "Mortgage Payment": "Recurring debts",
    "Sainsbury's": "shopping",
    "Shell Petrol": "Everything Else",
    "Salary": "Everything Else",
    "Utility - Electricity Direct Debit": "Bills",
    "Tesco": "Shopping",
    "Home Insurance": "Recurring Debts",
    "Coffee": "Eating Out",
    "Primark": "Shopping",
    "Phone Bill Direct Debit": "Bills",
    "Restaurant": "Eating Out",
    "Salary": "Everything Else",
    "Council Tax": "Everything Else",
    "Amazon UK - Electronics": "Shopping",
    "John Lewis - Home Goods": "Shopping",
    "Shell Petrol - Canary Wharf": "Everything Else",
    "eBay - Vintage Clothing": "Shopping",
    "Pret A Manger - Lunch": "Eating Out",
    "Payment Received - Thank You": "Everything Else",
    "ASOS - Clothing": "Everything Else",
    "Uber Eats - Food Delivery": "Eating Out",
    "Apple Store - App Purchase": "Shopping",
    "British Airways - Flight Booking": "Shopping",
    "Waitrose - Grocery": "Shopping",
    "Car Payment - BMW Finance": "Recurring Debts",
    "Hotel Booking - Premier Inn": "Everything Else",
    "Netflix Subscription": "Everything Else"
}


# ----------------------------
# Character recognition utils
# ----------------------------

SUPPORTED_PATTERNS = [
    "*.png", "*.PNG", "*.jpg", "*.JPG", "*.jpeg", "*.JPEG",
    "*.bmp", "*.BMP", "*.tiff", "*.TIFF", "*.tif", "*.TIF",
    "*.pdf", "*.PDF"
]


def _extract_transactions(text):
    """
    Heuristic: extract the lines that look like transactions.
    Start capturing after a line that begins with a date (DD-MM-YYYY or MM-DD-YYYY).
    Stop when encountering common footer phrases.
    """
    lines = text.split('\n')
    transactions = []
    in_transactions = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Start capturing when we see a date at the beginning
        if re.match(r'^\d{2}-\d{2}-\d{4}', line):
            in_transactions = True

        # Stop capturing when we hit footer text
        if in_transactions and any(footer in line for footer in ['B.C.P.A.', 'Use the Internet', 'keep track of your Account']):
            break

        if in_transactions:
            transactions.append(line)

    return '\n'.join(transactions)


def process_image_file(image_path):
    """Process a single image file and return extracted text."""
    try:
        img = Image.open(image_path)
        text = tess.image_to_string(img)
        return _extract_transactions(text)
    except Exception as e:
        print(f"Error processing image {image_path}: {str(e)}")
        return ""


def process_pdf_file(pdf_path):
    """Process a single PDF file and return extracted text from all pages."""
    try:
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
    This handles cases where this module is placed in a subfolder but the credit/debit folders
    are elsewhere in the repo.
    """
    script_directory = os.path.abspath(script_directory)

    candidates = []
    # Candidate locations (ordered)
    candidates.append(os.path.join(script_directory, target_folder))
    candidates.append(os.path.join(script_directory, "..", target_folder))
    candidates.append(os.path.join(script_directory, "..", "..", target_folder))
    candidates.append(os.path.join(script_directory, "..", "src", "backend", target_folder))
    candidates.append(os.path.join(script_directory, "..", "..", "src", "backend", target_folder))
    candidates.append(os.path.join(os.getcwd(), "src", "backend", target_folder))
    candidates.append(os.path.join(os.getcwd(), target_folder))
    candidates.append(target_folder)

    tried = []
    for c in candidates:
        norm = os.path.normpath(os.path.abspath(c))
        tried.append(norm)
        if os.path.isdir(norm):
            return norm

    # Debug info for why we didn't find it
    print(f"Debug: _find_candidate_dir tried these locations for '{target_folder}':")
    for t in tried:
        print(f"  - {t}")

    return None


def character_recognition():
    """
    Main function to process files in the creditStatements/ and debitStatements/ folders (searching likely locations).
    Returns a dict mapping keys "<folder>/<filename>" -> extracted_text
    Example keys: "credit/statement1.pdf", "debit/photo1.png"
    """
    script_directory = os.path.dirname(os.path.abspath(__file__))

    # The original code used 'creditStatements' and 'debitStatements' as target_folder names.
    credit_dir = _find_candidate_dir(script_directory, "credit")
    debit_dir = _find_candidate_dir(script_directory, "debit")

    print(f"Debug: resolved credit_dir -> {credit_dir}")
    print(f"Debug: resolved debit_dir  -> {debit_dir}")

    sources = []  # list of (folder_label, fullpath)
    if credit_dir:
        credit_files = _collect_files_from_dir(credit_dir)
        for f in credit_files:
            # Use a consistent short folder label for later processing
            sources.append(("credit", f))
    else:
        print("Warning: credit directory not found in searched locations.")

    if debit_dir:
        debit_files = _collect_files_from_dir(debit_dir)
        for f in debit_files:
            sources.append(("debit", f))
    else:
        print("Warning: debit directory not found in searched locations.")

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


# ----------------------------
# Transaction parsing / JSON conversion
# ----------------------------

def money_to_float(money_str):
    """Convert a money string like '£4,500.25' to float 4500.25"""
    if not money_str:
        return 0.0
    try:
        return float(money_str.replace("£", "").replace(",", ""))
    except Exception:
        print(f"Warning: couldn't parse money string '{money_str}'")
        return 0.0


def parse_transactions(transaction_list):
    """
    Parse lines of transactions into lists:
    [date_processed, date_of_transaction, card_id, transaction_details, amount, balance]
    """
    parsed_transactions = []

    # Regex pattern for transaction lines - flexible whitespace
    pattern = re.compile(
        r'(\d{2}-\d{2}-\d{4})\s+'            # date processed
        r'(\d{2}-\d{2}-\d{4})\s+'            # date of transaction
        r'(\d+\.?)\s+'                       # card id (digits, optionally trailing dot)
        r'(.+?)\s+'                          # transaction details (non-greedy)
        r'(\£\d{1,3}(?:,\d{3})*\.\d{2}|\£\d+\.\d{2})\s+'  # amount
        r'(\£\d{1,3}(?:,\d{3})*\.\d{2}|\£\d+\.\d{2})',    # balance
        flags=re.UNICODE
    )

    for transaction in transaction_list:
        match = pattern.search(transaction)
        if match:
            date_processed = match.group(1)
            date_of_transaction = match.group(2)
            card_id = match.group(3).rstrip('.')  # Remove trailing period if present
            transaction_details = match.group(4).strip()
            amount = match.group(5)
            balance = match.group(6)

            parsed_transactions.append([
                date_processed,
                date_of_transaction,
                card_id,
                transaction_details,
                amount,
                balance
            ])
        else:
            print(f"Warning: Could not parse transaction: {transaction}")

    return parsed_transactions


def convert_to_json(transaction_data):
    """
    Convert parsed transaction lists into JSON-like dicts.
    """
    json_list = []

    for transaction in transaction_data:
        json_obj = {
            "date-processed": transaction[0],
            "date-of-transaction": transaction[1],
            "company-name": transaction[3].strip(),
            "amount": transaction[4],
            "balance": transaction[5]
        }
        json_list.append(json_obj)

    return json_list


def parse_date_safe(date_str):
    """
    Try to parse a date string which can be either MM-DD-YYYY or DD-MM-YYYY.
    Returns a datetime.date or None.
    """
    if not date_str:
        return None
    for fmt in ("%m-%d-%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except Exception:
            pass
    return None


def process_transactions(raw_text, filename=""):
    """Process transaction text and return JSON result with money totals"""
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # Optional: if the first line is a header that doesn't start with a date, drop it
    if lines and not re.match(r'^\d{2}-\d{2}-\d{4}', lines[0]):
        lines.pop(0)

    # 1) Find the Opening Balance line (if present)
    opening_pattern = re.compile(
        r'(\d{2}-\d{2}-\d{4})\s+Opening Balance\s+(\£\d{1,3}(?:,\d{3})*\.\d{2}|\£\d+\.\d{2})',
        flags=re.IGNORECASE
    )

    opening_balance = None
    opening_date = None
    opening_index = None

    for idx, line in enumerate(lines):
        m = opening_pattern.search(line)
        if m:
            opening_date = m.group(1)
            opening_balance = m.group(2)
            opening_index = idx
            break

    if opening_index is not None:
        lines.pop(opening_index)
        print(f"Found opening balance on {opening_date}: {opening_balance}")
    else:
        print("No explicit opening balance line found. Will fall back to using the first transaction's balance as starting balance.")

    # 2) Parse the remaining lines into transactions
    parsed = parse_transactions(lines)

    # 3) Convert parsed transactions to JSON-style dicts
    json_result = convert_to_json(parsed)

    # 4) Determine types (deposit/withdrawal) using the opening balance if available
    if opening_balance is not None:
        prev_balance = money_to_float(opening_balance)
    else:
        if json_result:
            prev_balance = money_to_float(json_result[0]["balance"])
        else:
            prev_balance = 0.0

    money_in = 0.0
    money_out = 0.0

    for idx, entry in enumerate(json_result):
        current_balance = money_to_float(entry["balance"])
        diff = current_balance - prev_balance

        if diff > 0:
            entry["type"] = "deposit"
            money_in += diff
        elif diff < 0:
            entry["type"] = "withdrawal"
            money_out += abs(diff)
        else:
            entry["type"] = "no_change"

        prev_balance = current_balance

    if opening_balance is not None:
        opening_obj = {
            "date-processed": opening_date,
            "date-of-transaction": "",
            "company-name": "Opening Balance",
            "amount": opening_balance,
            "balance": opening_balance,
            "type": "opening_balance"
        }
        json_result.insert(0, opening_obj)

    # Add company types
    for dictionary in json_result:
        company_type = "Everything Else"
        name = dictionary.get("company-name", "")
        if name in companies:
            company_type = companies[name]
        dictionary["company-type"] = company_type

    return {
        "transactions": json_result,
        "summary": {
            "money_in": round(money_in, 2),
            "money_out": round(money_out, 2)
        }
    }


# ----------------------------
# Main runner which replaces the old separate script
# ----------------------------

def run_json_text():
    # Process all files in the credit/ and debit/ folders
    all_results = character_recognition()

    # Create output directory
    script_directory = os.path.dirname(os.path.abspath(__file__))
    output_directory = os.path.join(script_directory, "output")
    os.makedirs(output_directory, exist_ok=True)

    final_results = {}
    merged_transactions = []
    total_money_in = 0.0
    total_money_out = 0.0

    for filename_key, raw_text in all_results.items():
        print(f"\n{'='*50}")
        print(f"PROCESSING: {filename_key}")
        print(f"{'='*50}")

        if not raw_text:
            print(f"No text extracted from {filename_key}")
            final_results[filename_key] = {"error": "No text extracted", "transactions": []}
            continue

        try:
            # Determine card-type from folder label robustly
            folder = filename_key.split('/', 1)[0].lower() if '/' in filename_key else ""
            if folder in ("credit"):
                card_type = "credit"
            elif folder in ("debit"):
                card_type = "debit"
            else:
                card_type = None

            result = process_transactions(raw_text, filename_key)

            # Ensure every transaction from this file gets the card-type
            if card_type:
                for txn in result.get("transactions", []):
                    txn["card-type"] = card_type

            final_results[filename_key] = result

            print(json.dumps(result["transactions"], indent=2))
            print(f"\nSummary for {filename_key}:")
            print(f"Money in: £{result['summary']['money_in']}")
            print(f"Money out: £{result['summary']['money_out']}")

            # Save individual JSON file (safe name uses folder_filename)
            safe_name = filename_key.replace("/", "_")
            output_filename = os.path.splitext(safe_name)[0] + ".json"
            output_path = os.path.join(output_directory, output_filename)

            with open(output_path, 'w') as f:
                json.dump(result, f, indent=2)

            print(f"Saved results to {output_path}")

            # Merge transactions and accumulate summary totals
            merged_transactions.extend(result.get("transactions", []))
            total_money_in += result.get("summary", {}).get("money_in", 0.0)
            total_money_out += result.get("summary", {}).get("money_out", 0.0)

        except Exception as e:
            print(f"Error processing {filename_key}: {str(e)}")
            final_results[filename_key] = {"error": str(e), "transactions": []}

    # Sorting merged transactions
    def sort_key(txn):
        dp = parse_date_safe(txn.get("date-processed", ""))
        dt = parse_date_safe(txn.get("date-of-transaction", ""))
        dp_key = dp or datetime.min.date()
        dt_key = dt or datetime.min.date()
        return (dp_key, dt_key)

    merged_transactions.sort(key=sort_key)

    # Combined single-object output
    combined_output = {
        "transactions": merged_transactions,
        "summary": {
            "money_in": round(total_money_in, 2),
            "money_out": round(total_money_out, 2)
        }
    }

    combined_output_path = os.path.join(output_directory, "all_transactions.json")
    with open(combined_output_path, 'w') as f:
        json.dump(combined_output, f, indent=2)

    print(f"\nCombined results (single JSON) saved to {combined_output_path}")

    per_file_output_path = os.path.join(output_directory, "per_file_results.json")
    with open(per_file_output_path, 'w') as f:
        json.dump(final_results, f, indent=2)
    print(f"Per-file results saved to {per_file_output_path}")

    # ----------------- Split into category files -----------------
    desired_categories = ["shopping", "travel", "entertainment", "bills", "food", "everything else"]
    categories = {cat: [] for cat in desired_categories}
    category_summaries = {cat: {"money_in": 0.0, "money_out": 0.0} for cat in desired_categories}

    for txn in merged_transactions:
        company_type_raw = txn.get("company-type", "Everything Else")
        company_type = company_type_raw.lower().strip()

        if company_type in desired_categories:
            cat = company_type
        else:
            cat = "everything else"

        categories[cat].append(txn)

        # compute per-category money_in/out based on txn `type` and `amount`
        amt = money_to_float(txn.get("amount", ""))
        ttype = txn.get("type", "")
        if ttype == "deposit":
            category_summaries[cat]["money_in"] += amt
        elif ttype == "withdrawal":
            category_summaries[cat]["money_out"] += amt

    categories_dir = os.path.join(output_directory, "categories")
    os.makedirs(categories_dir, exist_ok=True)

    for cat in desired_categories:
        file_obj = {
            "category": cat,
            "transactions": categories[cat],
            "summary": {
                "money_in": round(category_summaries[cat]["money_in"], 2),
                "money_out": round(category_summaries[cat]["money_out"], 2),
                "count": len(categories[cat])
            }
        }
        cat_filename = f"{cat.replace(' ', '_')}.json"
        cat_path = os.path.join(categories_dir, cat_filename)
        with open(cat_path, 'w') as f:
            json.dump(file_obj, f, indent=2)
        print(f"Saved category '{cat}' -> {cat_path}")

    index_obj = {
        "created_at": datetime.utcnow().isoformat() + "Z",
        "files": {cat: os.path.join("categories", f"{cat.replace(' ', '_')}.json") for cat in desired_categories}
    }
    index_path = os.path.join(output_directory, "categories_index.json")
    with open(index_path, 'w') as f:
        json.dump(index_obj, f, indent=2)
    print(f"Saved categories index -> {index_path}")

    return combined_output


if __name__ == "__main__":
    # Run the full pipeline when executed directly
    combined = run_json_text()
    print("\n=== Final Summary ===")
    print(json.dumps(combined.get("summary", {}), indent=2))
