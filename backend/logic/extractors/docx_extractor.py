import docx

def extract_text_from_docx(file_path):
    """Extract full text from DOCX"""
    doc = docx.Document(file_path)
    texts = [p.text for p in doc.paragraphs]
    return [{"page_number": 1, "full_text": "\n".join(texts), "file_path": file_path}]
