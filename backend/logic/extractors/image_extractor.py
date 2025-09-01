import cv2
from ..ocr_utils import extract_table_or_text

def extract_text_from_image(file_path):
    """Extract text or tables from an image"""
    img = cv2.imread(file_path)
    if img is None:
        return [{"image_number": 1, "full_text": "", "file_path": file_path}]

    mode, result = extract_table_or_text(img)
    if mode == "table":
        table_text = "\n".join(["\t".join(map(str,row)) for row in result.values])
        text = f"[Table content]\n{table_text}"
    else:
        text = " ".join(result)

    return [{"image_number": 1, "full_text": text, "file_path": file_path}]
