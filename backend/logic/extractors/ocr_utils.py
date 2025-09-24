# # backend/logic/ocr_utils.py
# import cv2, pandas as pd, pytesseract, os
# import easyocr
# from .config import *

# # ===== OCR INIT =====
# reader = easyocr.Reader(['en'], gpu=False)
# tess_cmd = os.getenv("TESSERACT_CMD")
# if tess_cmd and os.path.exists(tess_cmd):
#     pytesseract.pytesseract.tesseract_cmd = tess_cmd

# def cluster_positions(pos_list, thresh=10):
#     pos_list = sorted(pos_list)
#     clustered = [pos_list[0]]
#     for p in pos_list[1:]:
#         if abs(p - clustered[-1]) > thresh:
#             clustered.append(p)
#     return clustered

# def clean_text_df(df):
#     df = df.replace(r"[|\]\[\}\{I™]+", "", regex=True)
#     df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
#     df = df.dropna(how="all", axis=0).dropna(how="all", axis=1)
#     return df.reset_index(drop=True)

# def extract_table_or_text(img, force_text=False, force_table=False):
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
#     if force_text:
#         text = pytesseract.image_to_string(gray, config="--psm 3").strip()
#         lines = [line for line in text.split("\n") if line.strip()]
#         return "text", lines
#     # detect tables
#     thresh = cv2.adaptiveThreshold(~gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, -2)
#     horizontal, vertical = thresh.copy(), thresh.copy()
#     cols, rows = horizontal.shape[1], vertical.shape[0]
#     horizontalStructure = cv2.getStructuringElement(cv2.MORPH_RECT, (max(1, cols // 30), 1))
#     verticalStructure = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(1, rows // 30)))
#     horizontal = cv2.dilate(cv2.erode(horizontal, horizontalStructure), horizontalStructure)
#     vertical = cv2.dilate(cv2.erode(vertical, verticalStructure), verticalStructure)
#     mask = horizontal + vertical
#     contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
#     boxes = [(x,y,w,h) for c in contours for (x,y,w,h) in [cv2.boundingRect(c)] if w>40 and h>20]

#     if force_table or len(boxes) >= 5:
#         row_positions = cluster_positions([y for (_,y,_,h) in boxes] + [y+h for (_,y,_,h) in boxes])
#         col_positions = cluster_positions([x for (x,_,w,_) in boxes] + [x+w for (x,_,w,_) in boxes])
#         table = []
#         for i in range(len(row_positions)-1):
#             row = []
#             for j in range(len(col_positions)-1):
#                 x1,y1,x2,y2 = col_positions[j], row_positions[i], col_positions[j+1], row_positions[i+1]
#                 roi = gray[y1:y2, x1:x2]
#                 if roi.size == 0:
#                     row.append(""); continue
#                 text = pytesseract.image_to_string(roi, config="--psm 6").strip()
#                 row.append(text if text else "")
#             table.append(row)
#         df = pd.DataFrame(table)
#         return "table", clean_text_df(df)

#     text = pytesseract.image_to_string(gray, config="--psm 3").strip()
#     lines = [line for line in text.split("\n") if line.strip()]
#     return "text", lines
# backend/logic/ocr_utils.py
import os
import logging
import re
import cv2
import numpy as np
import pandas as pd
import pytesseract
import tempfile
 
logger = logging.getLogger(__name__)
 
# Lazy easyocr import — heavy, so only created when needed
_easyocr_reader = None
def _get_easyocr_reader(lang_list=None):
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            langs = lang_list or ['en']
            # set gpu=False to avoid unexpected GPU issues unless explicitly needed
            _easyocr_reader = easyocr.Reader(langs, gpu=False)
        except Exception as e:
            logger.warning("easyocr not available: %s", e)
            _easyocr_reader = None
    return _easyocr_reader
 
# Respect env var TESSERACT_CMD if provided and valid
_tess_cmd = os.getenv("TESSERACT_CMD")
if _tess_cmd and os.path.exists(_tess_cmd):
    pytesseract.pytesseract.tesseract_cmd = _tess_cmd
 
def cluster_positions(pos_list, thresh=10):
    if not pos_list:
        return []
    pos_list = sorted(pos_list)
    clustered = [pos_list[0]]
    for p in pos_list[1:]:
        if abs(p - clustered[-1]) > thresh:
            clustered.append(p)
    return clustered
 
def clean_text_df(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()
    df = df.replace(r"[|\]\[\}\{I™]+", "", regex=True)
    df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
    df = df.dropna(how="all", axis=0).dropna(how="all", axis=1)
    return df.reset_index(drop=True)
 
def _resize_if_large(img, max_dim=2000):
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / float(max(h, w))
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
 
def _tesseract_image_to_lines(img_gray, psm=3):
    try:
        text = pytesseract.image_to_string(img_gray, config=f"--psm {psm}").strip()
        lines = [line for line in text.splitlines() if line.strip()]
        return lines
    except Exception as e:
        logger.exception("pytesseract failed: %s", e)
        # fallback to easyocr if available
        reader = _get_easyocr_reader()
        if reader:
            try:
                res = reader.readtext(img_gray)
                texts = [t[1] for t in res if t and len(t) > 1]
                return texts
            except Exception as e2:
                logger.exception("easyocr fallback failed: %s", e2)
        return []
 
def extract_table_or_text(img, force_text=False, force_table=False, resize_max=2000):
    """
    Returns:
      ("text", list_of_lines) or ("table", pandas.DataFrame)
    Guarantees no exceptions escape; returns empty list/df on failure.
    """
    try:
        if img is None:
            return "text", []
 
        # Ensure grayscale
        try:
            if len(img.shape) == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img
        except Exception:
            # if conversion fails, try to coerce via numpy
            gray = np.array(img, dtype=np.uint8)
            if len(gray.shape) == 3:
                gray = cv2.cvtColor(gray, cv2.COLOR_BGR2GRAY)
 
        # Resize if extremely large
        gray = _resize_if_large(gray, max_dim=resize_max)
 
        if force_text:
            lines = _tesseract_image_to_lines(gray, psm=3)
            return "text", lines
 
        # Table detection (morphological). If these operations fail, fallback to text.
        try:
            # adaptiveThreshold requires 8-bit image
            thresh = cv2.adaptiveThreshold(~gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                           cv2.THRESH_BINARY, 15, -2)
            horizontal = thresh.copy()
            vertical = thresh.copy()
            cols = horizontal.shape[1]
            rows = vertical.shape[0]
            # tune kernel sizes relative to image size
            horiz_size = max(1, cols // 30)
            vert_size = max(1, rows // 30)
            horizontalStructure = cv2.getStructuringElement(cv2.MORPH_RECT, (horiz_size, 1))
            verticalStructure = cv2.getStructuringElement(cv2.MORPH_RECT, (1, vert_size))
            horizontal = cv2.dilate(cv2.erode(horizontal, horizontalStructure), horizontalStructure)
            vertical = cv2.dilate(cv2.erode(vertical, verticalStructure), verticalStructure)
            mask = horizontal + vertical
            contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            boxes = [(x, y, w, h) for c in contours for (x, y, w, h) in [cv2.boundingRect(c)] if w > 40 and h > 20]
        except Exception as e:
            logger.exception("Table detection failed, fallback to text: %s", e)
            boxes = []
 
        # Decide whether to treat as table
        if force_table or len(boxes) >= 5:
            try:
                row_positions = cluster_positions([y for (_, y, _, h) in boxes] + [y + h for (_, y, _, h) in boxes], thresh=10)
                col_positions = cluster_positions([x for (x, _, w, _) in boxes] + [x + w for (x, _, w, _) in boxes], thresh=10)
 
                # sanity check
                if len(row_positions) < 2 or len(col_positions) < 2:
                    raise ValueError("not enough table grid positions")
 
                table = []
                for i in range(len(row_positions) - 1):
                    row = []
                    y1, y2 = row_positions[i], row_positions[i + 1]
                    for j in range(len(col_positions) - 1):
                        x1, x2 = col_positions[j], col_positions[j + 1]
                        # clamp
                        x1c, x2c = max(0, x1), min(gray.shape[1], x2)
                        y1c, y2c = max(0, y1), min(gray.shape[0], y2)
                        roi = gray[y1c:y2c, x1c:x2c]
                        if roi.size == 0:
                            row.append("")
                            continue
                        cell_text = _tesseract_image_to_lines(roi, psm=6)
                        cell_join = " ".join(cell_text).strip()
                        row.append(cell_join if cell_join else "")
                    table.append(row)
                df = pd.DataFrame(table)
                df = clean_text_df(df)
                return "table", df
            except Exception as e:
                logger.exception("Table parsing failed, fallback to text: %s", e)
 
        # Fallback: plain text OCR
        lines = _tesseract_image_to_lines(gray, psm=3)
        return "text", lines
 
    except Exception as e:
        logger.exception("extract_table_or_text unexpected error: %s", e)
        return "text", []