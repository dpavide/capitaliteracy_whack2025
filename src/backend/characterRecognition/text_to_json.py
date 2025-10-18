from characterRecognition import character_recognition, character_recognition_single
from dataset.company_to_type import companies
import re
import json
import os

def money_to_float(money_str):
    """Convert a money string like '$4,500.25' to float 4500.25"""
    return float(money_str.replace("$", "").replace(",", ""))

def parse_transactions(transaction_list):
    """
    Parse lines of transactions into lists:
    [date_processed, date_of_transaction, card_id, transaction_details, amount, balance]
    """
    parsed_transactions = []
    
    # Regex pattern for transaction lines
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

def process_transactions(raw_text, filename=""):
    """Process transaction text and return JSON result with money totals"""
    # Split into lines and strip whitespace, ignore empty lines
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    # If the OCR output had a header line you used to pop, don't assume it's always present.
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

    money_in = 0
    money_out = 0

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
            "date-of-transaction": "",      # no separate txn date for opening balance
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
        if "company-name" in dictionary and dictionary["company-name"] in companies:
            company_type = companies[dictionary["company-name"]]
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
    # Process all files in the images folder
    all_results = character_recognition()
    
    # Create output directory
    script_directory = os.path.dirname(os.path.abspath(__file__))
    output_directory = os.path.join(script_directory, "output")
    os.makedirs(output_directory, exist_ok=True)
    
    # Process each file's results
    final_results = {}
    
    for filename, raw_text in all_results.items():
        print(f"\n{'='*50}")
        print(f"PROCESSING: {filename}")
        print(f"{'='*50}")
        
        if not raw_text:
            print(f"No text extracted from {filename}")
            final_results[filename] = {"error": "No text extracted", "transactions": []}
            continue
            
        try:
            # Process the transactions for this file
            result = process_transactions(raw_text, filename)
            final_results[filename] = result
            
            # Print results for this file
            print(json.dumps(result["transactions"], indent=2))
            print(f"\nSummary for {filename}:")
            print(f"Money in: ${result['summary']['money_in']}")
            print(f"Money out: ${result['summary']['money_out']}")
            
            # Save individual JSON file
            output_filename = os.path.splitext(filename)[0] + ".json"
            output_path = os.path.join(output_directory, output_filename)
            
            with open(output_path, 'w') as f:
                json.dump(result, f, indent=2)
            
            print(f"Saved results to {output_path}")
            
        except Exception as e:
            print(f"Error processing {filename}: {str(e)}")
            final_results[filename] = {"error": str(e), "transactions": []}
    
    # Also save combined results
    combined_output_path = os.path.join(output_directory, "all_transactions.json")
    with open(combined_output_path, 'w') as f:
        json.dump(final_results, f, indent=2)
    
    print(f"\nCombined results saved to {combined_output_path}")


# Shopping
# Travel
# Entertainment 
# Bills
# Food
# Everything Else