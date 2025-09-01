# backend/logic/ocr_utils.py
import cv2, pandas as pd, pytesseract, os
import easyocr
from .config import *

# ===== OCR INIT =====
reader = easyocr.Reader(['en'], gpu=False)
tess_cmd = os.getenv("TESSERACT_CMD")
if tess_cmd and os.path.exists(tess_cmd):
    pytesseract.pytesseract.tesseract_cmd = tess_cmd

def cluster_positions(pos_list, thresh=10):
    pos_list = sorted(pos_list)
    clustered = [pos_list[0]]
    for p in pos_list[1:]:
        if abs(p - clustered[-1]) > thresh:
            clustered.append(p)
    return clustered

def clean_text_df(df):
    df = df.replace(r"[|\]\[\}\{I™]+", "", regex=True)
    df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
    df = df.dropna(how="all", axis=0).dropna(how="all", axis=1)
    return df.reset_index(drop=True)

def extract_table_or_text(img, force_text=False, force_table=False):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    if force_text:
        text = pytesseract.image_to_string(gray, config="--psm 3").strip()
        lines = [line for line in text.split("\n") if line.strip()]
        return "text", lines
    # detect tables
    thresh = cv2.adaptiveThreshold(~gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, -2)
    horizontal, vertical = thresh.copy(), thresh.copy()
    cols, rows = horizontal.shape[1], vertical.shape[0]
    horizontalStructure = cv2.getStructuringElement(cv2.MORPH_RECT, (max(1, cols // 30), 1))
    verticalStructure = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(1, rows // 30)))
    horizontal = cv2.dilate(cv2.erode(horizontal, horizontalStructure), horizontalStructure)
    vertical = cv2.dilate(cv2.erode(vertical, verticalStructure), verticalStructure)
    mask = horizontal + vertical
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    boxes = [(x,y,w,h) for c in contours for (x,y,w,h) in [cv2.boundingRect(c)] if w>40 and h>20]

    if force_table or len(boxes) >= 5:
        row_positions = cluster_positions([y for (_,y,_,h) in boxes] + [y+h for (_,y,_,h) in boxes])
        col_positions = cluster_positions([x for (x,_,w,_) in boxes] + [x+w for (x,_,w,_) in boxes])
        table = []
        for i in range(len(row_positions)-1):
            row = []
            for j in range(len(col_positions)-1):
                x1,y1,x2,y2 = col_positions[j], row_positions[i], col_positions[j+1], row_positions[i+1]
                roi = gray[y1:y2, x1:x2]
                if roi.size == 0:
                    row.append(""); continue
                text = pytesseract.image_to_string(roi, config="--psm 6").strip()
                row.append(text if text else "")
            table.append(row)
        df = pd.DataFrame(table)
        return "table", clean_text_df(df)

    text = pytesseract.image_to_string(gray, config="--psm 3").strip()
    lines = [line for line in text.split("\n") if line.strip()]
    return "text", lines
