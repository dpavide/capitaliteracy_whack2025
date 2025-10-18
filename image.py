   import pytesseract as tess
    from PIL import Image

    tess.pytesseract.tesseract_cmd= r"D:\softies\Python Packages\Tesseract-OCR\tesseract.exe"
    img_path = "img.jpg"
    img = Image.open(path)
    text= tess.image_to_string(img)
    print(text)
    with open(r"C:\Users\a\Desktop\save.txt",'w') as f:
        print(text,file=f)