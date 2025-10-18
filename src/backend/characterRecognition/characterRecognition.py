import pytesseract as tess
from PIL import Image
import os
import re
from pdf2image import convert_from_path
import glob

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
        # Convert PDF to images
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

def character_recognition_for_file(file_path):
    """Process a single file (image or PDF) and return extracted text"""
    file_ext = os.path.splitext(file_path)[1].lower()
    
    if file_ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']:
        return process_image_file(file_path)
    elif file_ext == '.pdf':
        return process_pdf_file(file_path)
    else:
        print(f"Unsupported file type: {file_path}")
        return ""

def character_recognition():
    """Main function to process all files in the images folder"""
    # Finds the current directory
    script_directory = os.path.dirname(os.path.abspath(__file__))
    parent_directory = os.path.dirname(script_directory)
    images_directory = os.path.join(parent_directory, "images")
    
    # Get all image and PDF files
    image_files = glob.glob(os.path.join(images_directory, "*.[pP][nN][gG]"))
    image_files += glob.glob(os.path.join(images_directory, "*.[jJ][pP][gG]"))
    image_files += glob.glob(os.path.join(images_directory, "*.[jJ][pP][eE][gG]"))
    image_files += glob.glob(os.path.join(images_directory, "*.[bB][mM][pP]"))
    image_files += glob.glob(os.path.join(images_directory, "*.[tT][iI][fF][fF]"))
    image_files += glob.glob(os.path.join(images_directory, "*.[tT][iI][fF]"))
    pdf_files = glob.glob(os.path.join(images_directory, "*.[pP][dD][fF]"))
    
    all_files = image_files + pdf_files
    
    if not all_files:
        print("No image or PDF files found in the images folder")
        return {}
    
    results = {}
    
    for file_path in all_files:
        filename = os.path.basename(file_path)
        print(f"Processing: {filename}")
        
        raw_text = character_recognition_for_file(file_path)
        
        if raw_text:
            results[filename] = raw_text
        else:
            results[filename] = ""
    
    return results

# Keep the original single image function for backward compatibility
def character_recognition_single(image_name="image.png"):
    """Process a single image file (original function for backward compatibility)"""
    script_directory = os.path.dirname(os.path.abspath(__file__))
    parent_directory = os.path.dirname(script_directory)
    img_path = os.path.join(parent_directory, "images", image_name)
    
    if os.path.exists(img_path):
        return character_recognition_for_file(img_path)
    else:
        print(f"Image file not found: {img_path}")
        return ""
