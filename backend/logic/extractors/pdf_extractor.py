import fitz  # PyMuPDF

def extract_text_from_pdf(file_path):
    """Extract text page-wise from a PDF"""
    doc = fitz.open(file_path)
    texts = [page.get_text("text") for page in doc]
    pages = "\f".join(texts).split("\f")
    return [{"page_number": i+1, "full_text": page, "file_path": file_path} for i, page in enumerate(pages)]
