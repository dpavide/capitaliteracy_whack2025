from characterRecognition import character_recognition, character_recognition_single
from dataset.company_to_type import companies
import re
import json
import os
from datetime import datetime

def money_to_float(money_str):
    """Convert a money string like '$4,500.25' to float 4500.25"""
    if not money_str:
        return 0.0
    try:
        return float(money_str.replace("$", "").replace(",", ""))
    except Exception:
        # If parsing fails, return 0.0 and warn
        print(f"Warning: couldn't parse money string '{money_str}'")
        return 0.0

def parse_transactions(transaction_list):
    """
    Parse lines of transactions into lists:
    [date_processed, date_of_transaction, card_id, transaction_details, amount, balance]
    """
    parsed_transactions = []

    # Regex pattern for transaction lines - keep flexible in whitespace
    pattern = re.compile(
        r'(\d{2}-\d{2}-\d{4})\s+'            # date processed
        r'(\d{2}-\d{2}-\d{4})\s+'            # date of transaction
        r'(\d+\.?)\s+'                       # card id (digits, optionally trailing dot)
        r'(.*?)\s+'                          # transaction details (non-greedy)
        r'(\$\d{1,3}(?:,\d{3})*\.\d{2}|\$\d+\.\d{2})\s+'  # amount
        r'(\$\d{1,3}(?:,\d{3})*\.\d{2}|\$\d+\.\d{2})',    # balance
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
            # If the main pattern fails, warn and continue
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
    # Split into lines and strip whitespace, ignore empty lines
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # Optional: if the first line is a header that doesn't start with a date, drop it
    if lines and not re.match(r'^\d{2}-\d{2}-\d{4}', lines[0]):
        lines.pop(0)

    # 1) Find the Opening Balance line (if present)
    opening_pattern = re.compile(
        r'(\d{2}-\d{2}-\d{4})\s+Opening Balance\s+(\$\d{1,3}(?:,\d{3})*\.\d{2}|\$\d+\.\d{2})',
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

    # If found, remove that line from transaction lines so it doesn't get parsed as a transaction
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
        # fallback: use the balance from the first parsed transaction as prev_balance
        if json_result:
            prev_balance = money_to_float(json_result[0]["balance"])
        else:
            prev_balance = 0.0

    money_in = 0.0
    money_out = 0.0

    # Iterate through all transactions and set type based on comparison to prev_balance
    for idx, entry in enumerate(json_result):
        current_balance = money_to_float(entry["balance"])
        diff = current_balance - prev_balance

        # positive diff means balance increased -> deposit, else withdrawal
        if diff > 0:
            entry["type"] = "deposit"
            money_in += diff
        elif diff < 0:
            entry["type"] = "withdrawal"
            money_out += abs(diff)
        else:
            entry["type"] = "no_change"

        # update prev_balance for the next iteration
        prev_balance = current_balance

    # If you want to include the opening balance as a separate JSON object at the start:
    if opening_balance is not None:
        opening_obj = {
            "date-processed": opening_date,
            "date-of-transaction": "",  # no separate txn date for opening balance
            "company-name": "Opening Balance",
            "amount": opening_balance,
            "balance": opening_balance,
            "type": "opening_balance"
        }
        # Insert at the very start if desired (optional)
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

# -------------------- Main flow --------------------
if __name__ == "__main__":
    # Process all files in the credit/ and debit/ folders
    all_results = character_recognition()

    # Create output directory
    script_directory = os.path.dirname(os.path.abspath(__file__))
    output_directory = os.path.join(script_directory, "output")
    os.makedirs(output_directory, exist_ok=True)

    # We'll still keep per-file results, but create a single merged result for the user
    final_results = {}
    merged_transactions = []
    total_money_in = 0.0
    total_money_out = 0.0

    for filename_key, raw_text in all_results.items():
        # filename_key is like "credit/statement1.pdf" or "debit/photo1.png"
        print(f"\n{'='*50}")
        print(f"PROCESSING: {filename_key}")
        print(f"{'='*50}")

        if not raw_text:
            print(f"No text extracted from {filename_key}")
            final_results[filename_key] = {"error": "No text extracted", "transactions": []}
            continue

        try:
            # Determine card-type from the folder part of the key
            folder = filename_key.split('/', 1)[0].lower() if '/' in filename_key else ""
            if folder == "credit":
                card_type = "credit"
            elif folder == "debit":
                card_type = "debit"
            else:
                # default/unknown - leave None (shouldn't happen since we only collect credit/debit)
                card_type = None

            # Process the transactions for this file
            result = process_transactions(raw_text, filename_key)

            # Ensure every transaction from this file gets the card-type
            if card_type:
                for txn in result.get("transactions", []):
                    # Overwrite or set card-type
                    txn["card-type"] = card_type

            final_results[filename_key] = result

            # Print results for this file
            print(json.dumps(result["transactions"], indent=2))
            print(f"\nSummary for {filename_key}:")
            print(f"Money in: ${result['summary']['money_in']}")
            print(f"Money out: ${result['summary']['money_out']}")

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

    # Optional: sort merged transactions by date-processed then date-of-transaction (most natural chronological)
    def sort_key(txn):
        dp = parse_date_safe(txn.get("date-processed", ""))
        dt = parse_date_safe(txn.get("date-of-transaction", ""))
        # Use very early date when None so opening balances appear first for that file
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

    # Save the combined single JSON (this is the one with a single top-level object)
    combined_output_path = os.path.join(output_directory, "all_transactions.json")
    with open(combined_output_path, 'w') as f:
        json.dump(combined_output, f, indent=2)

    print(f"\nCombined results (single JSON) saved to {combined_output_path}")

    # Also save the per-file results (unchanged behavior) if you want to keep them for debugging
    per_file_output_path = os.path.join(output_directory, "per_file_results.json")
    with open(per_file_output_path, 'w') as f:
        json.dump(final_results, f, indent=2)
    print(f"Per-file results saved to {per_file_output_path}")

    # ----------------- NEW: Split into category files -----------------
    # categories we want (lowercase keys)
    desired_categories = ["shopping", "travel", "entertainment", "bills", "food", "everything else"]
    categories = {cat: [] for cat in desired_categories}
    category_summaries = {cat: {"money_in": 0.0, "money_out": 0.0} for cat in desired_categories}

    # map each transaction into a category
    for txn in merged_transactions:
        company_type_raw = txn.get("company-type", "Everything Else")
        company_type = company_type_raw.lower().strip()

        if company_type in desired_categories:
            cat = company_type
        else:
            # If the company_type is not one of the desired categories, treat it as everything else
            cat = "everything else"

        categories[cat].append(txn)

        # compute per-category money_in/out based on txn `type` and `amount`
        amt = money_to_float(txn.get("amount", ""))
        ttype = txn.get("type", "")
        if ttype == "deposit":
            category_summaries[cat]["money_in"] += amt
        elif ttype == "withdrawal":
            category_summaries[cat]["money_out"] += amt
        # opening_balance and no_change are ignored for money_in/out sums

    # Create category folder
    categories_dir = os.path.join(output_directory, "categories")
    os.makedirs(categories_dir, exist_ok=True)

    # Save each category to its own file with a small summary
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
        cat_filename = f"{cat.replace(' ', '_')}.json"  # e.g., everything else -> everything_else.json
        cat_path = os.path.join(categories_dir, cat_filename)
        with open(cat_path, 'w') as f:
            json.dump(file_obj, f, indent=2)
        print(f"Saved category '{cat}' -> {cat_path}")

    # Also save an index listing for convenience
    index_obj = {
        "created_at": datetime.utcnow().isoformat() + "Z",
        "files": {cat: os.path.join("categories", f"{cat.replace(' ', '_')}.json") for cat in desired_categories}
    }
    index_path = os.path.join(output_directory, "categories_index.json")
    with open(index_path, 'w') as f:
        json.dump(index_obj, f, indent=2)
    print(f"Saved categories index -> {index_path}")
