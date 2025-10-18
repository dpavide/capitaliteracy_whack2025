import pytesseract as tess
from PIL import Image
import os
import re

def _extract_transactions(text):
    lines = text.split('\n')
    transactions = []
    in_transactions = False
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Start capturing when we see a date in DD-MM-YYYY format at the beginning
        if re.match(r'\d{2}-\d{2}-\d{4}', line):
            in_transactions = True
            
        # Stop capturing when we hit footer text
        if in_transactions and any(footer in line for footer in ['B.C.P.A.', 'Use the Internet', 'keep track of your Account']):
            break
            
        if in_transactions:
            transactions.append(line)
            
    return '\n'.join(transactions)

def character_recognition(image_name=""):

    # Finds the current directory
    script_directory = os.path.dirname(os.path.abspath(__file__))
    parent_directory = os.path.dirname(script_directory)

    # Creates image
    img_path = os.path.join(parent_directory, "images", "image.png")
    img = Image.open(img_path)

    # Finds text
    text = tess.image_to_string(img)
    # print(text)

    # print(_extract_transactions(text))

    return _extract_transactions(text)


# --- Saves to file ---
# with open(r"",'w') as f:
#     print(text,file=f)



# Might need to pass into an llm to parse
# Then llm should give json

# Batches in parallel

# {
#     [
#         {"date": "06012021", "company-name": "Netflix", "type": "Entertainment", "amount": "11.22"},
#         {"date": "02032023", "company-name": "shopify"},
#         "etc."
#     ]
# }