# import fitz  # PyMuPDF

# def extract_text_from_pdf(file_path):
#     """Extract text page-wise from a PDF"""
#     doc = fitz.open(file_path)
#     texts = [page.get_text("text") for page in doc]
#     pages = "\f".join(texts).split("\f")
#     return [{"page_number": i+1, "full_text": page, "file_path": file_path} for i, page in enumerate(pages)]
import fitz  # PyMuPDF
import cv2
import pytesseract
import easyocr
import numpy as np
import os

# ===== OCR INIT =====
reader = easyocr.Reader(['en'], gpu=False)
tess_cmd = os.getenv("TESSERACT_CMD")
if tess_cmd and os.path.exists(tess_cmd):
    pytesseract.pytesseract.tesseract_cmd = tess_cmd


def extract_text_from_pdf(file_path):
    """
    Extract text page-wise from a PDF.
    - Uses PyMuPDF for native text.
    - Falls back to OCR (pytesseract + easyocr) for scanned/image PDFs.
    
    Returns: List[dict] with keys:
        - page_number
        - full_text
        - file_path
    """
    doc = fitz.open(file_path)
    extracted_pages = []

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text")

        # OCR fallback if page has no text
        if not text.strip():
            pix = page.get_pixmap(dpi=300)  # Render to image
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)

            if pix.n == 4:  # RGBA → BGR
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)

            # First try pytesseract
            text = pytesseract.image_to_string(img).strip()

            # Fallback to easyocr if pytesseract result is weak
            if len(text) < 10:
                results = reader.readtext(img, detail=0)
                text = "\n".join(results)

        extracted_pages.append({
            "page_number": page_num,
            "full_text": text,
            "file_path": file_path
        })

    return extracted_pages
