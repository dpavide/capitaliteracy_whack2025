#!/usr/bin/env python3
"""
find_percentages.py

Usage:
    python find_percentages.py
    python find_percentages.py --all_transactions /path/to/all_transactions.json --categories_dir ./output/categories --out ./output/category_percentages.json

Behavior:
 - Reads all_transactions.json (tries backend/characterRecognition/output/all_transactions.json then ./output/all_transactions.json).
 - Uses summary.money_in if present; otherwise computes total money_in from transactions (card-type == 'debit', excluding Opening Balance).
 - Reads each JSON file in categories_dir, uses summary.money_in (or computes from transactions) to produce a percentage share.
 - Outputs a JSON list of {"name": <category name>, "percentage": <int>} (rounded and adjusted to sum to 100).
"""

import os
import json
import argparse
import glob
import re
from decimal import Decimal, InvalidOperation

def money_to_decimal(money_str):
    """Convert strings like '£4,500.25' or '4500.25' or '4,500.25' to Decimal('4500.25')."""
    if money_str is None:
        return Decimal("0.00")
    try:
        s = str(money_str).strip()
        # remove currency symbols and commas and whitespace
        s = re.sub(r'[^\d\.\-]', '', s)
        if s in ("", "-", ".", "-."):
            return Decimal("0.00")
        return Decimal(s)
    except (InvalidOperation, ValueError):
        try:
            return Decimal(float(money_str))
        except Exception:
            return Decimal("0.00")

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def compute_total_from_all_transactions(all_txn_obj):
    """
    Prefer summary.money_in if present.
    Otherwise compute: sum(amount) for transactions where card-type == 'debit'
    Exclude transactions where company-type indicates Opening Balance.
    """
    if not isinstance(all_txn_obj, dict):
        return Decimal("0.00")

    summary = all_txn_obj.get("summary", {})
    if summary and "money_in" in summary:
        try:
            return money_to_decimal(summary["money_in"])
        except Exception:
            pass

    # fallback compute
    total = Decimal("0.00")
    for txn in all_txn_obj.get("transactions", []):
        try:
            company_type = txn.get("company-type", "") or ""
            if company_type.lower().strip().startswith("opening"):
                continue
            card_type = (txn.get("card-type", "") or "").lower().strip()
            if card_type == "debit":
                amt = money_to_decimal(txn.get("amount", "0"))
                total += amt
        except Exception:
            pass
    return total

def compute_category_money_in(cat_obj):
    """
    Use cat_obj['summary']['money_in'] when present, else compute from transactions (card-type == 'debit').
    """
    if not isinstance(cat_obj, dict):
        return Decimal("0.00")
    summary = cat_obj.get("summary", {})
    if summary and "money_in" in summary:
        return money_to_decimal(summary["money_in"])

    # fallback compute
    total = Decimal("0.00")
    for txn in cat_obj.get("transactions", []):
        try:
            card_type = (txn.get("card-type", "") or "").lower().strip()
            # skip opening balance entries
            company_type = (txn.get("company-type", "") or "")
            if company_type.lower().strip().startswith("opening"):
                continue
            if card_type == "debit":
                amt = money_to_decimal(txn.get("amount", "0"))
                total += amt
        except Exception:
            pass
    return total

def find_percentages(all_transactions_paths, categories_dir, out_path):
    all_txn_obj = None
    for p in all_transactions_paths:
        if p and os.path.exists(p):
            try:
                all_txn_obj = load_json(p)
                print(f"Loaded all-transactions from: {p}")
                break
            except Exception as e:
                print(f"Warning: couldn't load {p}: {e}")

    if all_txn_obj is None:
        raise FileNotFoundError("Could not find or load any all_transactions.json in the provided paths.")

    total_money_in = compute_total_from_all_transactions(all_txn_obj)
    print(f"Total money_in (denominator): {total_money_in}")

    # collect category files
    cat_pattern = os.path.join(categories_dir, "*.json")
    cat_files = sorted(glob.glob(cat_pattern))
    if not cat_files:
        raise FileNotFoundError(f"No category JSON files found in directory: {categories_dir}")

    categories = []
    for cf in cat_files:
        try:
            obj = load_json(cf)
        except Exception as e:
            print(f"Skipping {cf}: cannot load JSON ({e})")
            continue

        # determine category name
        name = obj.get("category") or os.path.splitext(os.path.basename(cf))[0]
        money_in = compute_category_money_in(obj)
        categories.append({
            "name": str(name),
            "money_in": money_in,
            "source_file": cf
        })

    # If total is zero (avoid division by zero), output zero percentages
    if total_money_in == Decimal("0.00"):
        output = [{"name": c["name"], "percentage": 0} for c in categories]
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2)
        print(f"Wrote percentages (all zeros) to {out_path}")
        print(json.dumps(output, indent=2))
        return output

    # compute raw percentages as float
    for c in categories:
        pct = (c["money_in"] / total_money_in) * Decimal(100)
        c["pct_float"] = float(pct)  # for debugging
        # store rounded integer
        c["pct_rounded"] = int(round(pct))

    # adjust rounding so total sums to 100
    sum_rounded = sum(c["pct_rounded"] for c in categories)
    diff = 100 - sum_rounded
    if diff != 0 and categories:
        # find category with largest money_in to absorb the diff
        categories_sorted = sorted(categories, key=lambda x: (x["money_in"], x["pct_float"]), reverse=True)
        categories_sorted[0]["pct_rounded"] += diff
        # reflect change back into categories list
        name_to_new = {c["name"]: c["pct_rounded"] for c in categories_sorted}
        for c in categories:
            c["pct_rounded"] = name_to_new[c["name"]]

    # prepare final output, sort by percentage descending (like your example)
    final = [{"name": c["name"], "percentage": int(c["pct_rounded"])} for c in sorted(categories, key=lambda x: x["pct_rounded"], reverse=True)]

    # save and print
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final, f, indent=2)

    print(f"Wrote percentages to {out_path}")
    print(json.dumps(final, indent=2))
    return final

def main():
    parser = argparse.ArgumentParser(description="Compute category percentages of money_in using all_transactions.json and category summaries.")
    parser.add_argument("--all_transactions", "-a",
                        help="Path to all_transactions.json (first one found will be used).",
                        default=None)
    parser.add_argument("--categories_dir", "-c",
                        help="Directory containing category JSON files (default: ./output/categories).",
                        default=os.path.join(".", "output", "categories"))
    parser.add_argument("--out", "-o",
                        help="Output JSON path (default: ./output/category_percentages.json).",
                        default=os.path.join(".", "output", "category_percentages.json"))
    args = parser.parse_args()

    # default search paths for all_transactions.json (as you specified)
    candidate_paths = []
    if args.all_transactions:
        candidate_paths.append(args.all_transactions)
    # preferred location you mentioned
    candidate_paths.append(os.path.join("backend", "characterRecognition", "output", "all_transactions.json"))
    candidate_paths.append(os.path.join(".", "output", "all_transactions.json"))
    candidate_paths.append(os.path.join(".", "backend", "characterRecognition", "output", "all_transactions.json"))

    try:
        find_percentages(candidate_paths, args.categories_dir, args.out)
    except Exception as e:
        print("Error:", e)
        raise

if __name__ == "__main__":
    main()
