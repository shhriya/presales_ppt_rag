# import cv2
# from ..ocr_utils import extract_table_or_text

# def extract_text_from_image(file_path):
#     """Extract text or tables from an image"""
#     img = cv2.imread(file_path)
#     if img is None:
#         return [{"image_number": 1, "full_text": "", "file_path": file_path}]

#     mode, result = extract_table_or_text(img)
#     if mode == "table":
#         table_text = "\n".join(["\t".join(map(str,row)) for row in result.values])
#         text = f"[Table content]\n{table_text}"
#     else:
#         text = " ".join(result)

#     return [{"image_number": 1, "full_text": text, "file_path": file_path}]



import os
import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Any
import cv2
import numpy as np
from PIL import Image, ImageSequence
 
from .ocr_utils import extract_table_or_text
 
logger = logging.getLogger(__name__)
 
def _imread_fallback(path):
    # cv2.imread sometimes fails for certain formats; try PIL fallback
    try:
        from PIL import Image
        img_pil = Image.open(path)
        img_pil = img_pil.convert("RGB")
        arr = np.array(img_pil)[:, :, ::-1]  # RGB->BGR
        return arr
    except Exception as e:
        logger.exception("PIL fallback failed: %s", e)
        return None
 
def extract_text_from_image(file_path: str, force_text=False, force_table=False) -> List[Dict[str, Any]]:
    """
    Robust image extractor.
    Returns a list of dicts:
      {"file_name", "file_path", "image_number", "mode", "full_text", "status"}
    - Handles multi-frame images (TIFF) by returning multiple entries.
    - Never raises; returns status:"error" if something went wrong.
    """
    results = []
    p = Path(file_path)
    file_name = p.name
 
    if not p.exists():
        return [{"file_name": file_name, "file_path": file_path, "image_number": 0, "full_text": "", "mode": None, "status": "error", "error": "file_not_found"}]
 
    # Try to detect multi-frame via PIL
    try:
        pil_img = Image.open(file_path)
        is_multiframe = getattr(pil_img, "is_animated", False) or isinstance(pil_img, Image.Image) and hasattr(pil_img, "n_frames") and getattr(pil_img, "n_frames", 1) > 1
    except Exception:
        pil_img = None
        is_multiframe = False
 
    if is_multiframe and pil_img is not None:
        # iterate frames
        try:
            for idx, frame in enumerate(ImageSequence.Iterator(pil_img), start=1):
                try:
                    frame_rgb = frame.convert("RGB")
                    arr = np.array(frame_rgb)[:, :, ::-1]  # RGB -> BGR for cv2
                    mode, result = extract_table_or_text(arr, force_text=force_text, force_table=force_table)
                    if mode == "table" and hasattr(result, "values"):
                        # convert DataFrame to TSV-like string
                        txt = result.to_csv(sep="\t", index=False, header=False)
                    else:
                        txt = " ".join(result) if isinstance(result, (list, tuple)) else str(result)
                    results.append({
                        "file_name": file_name,
                        "file_path": file_path,
                        "image_number": idx,
                        "mode": mode,
                        "full_text": txt,
                        "status": "ok"
                    })
                except Exception as e:
                    logger.exception("frame processing failed: %s", e)
                    results.append({
                        "file_name": file_name,
                        "file_path": file_path,
                        "image_number": idx,
                        "mode": None,
                        "full_text": "",
                        "status": "error",
                        "error": str(e)
                    })
            return results
        except Exception as e:
            logger.exception("multiframe handling failed: %s", e)
            # fall through to single frame processing
 
    # Single-frame processing
    try:
        img = cv2.imread(str(file_path))
        if img is None:
            img = _imread_fallback(str(file_path))
        if img is None:
            return [{"file_name": file_name, "file_path": file_path, "image_number": 1, "mode": None, "full_text": "", "status": "error", "error": "could_not_read_image"}]
 
        mode, result = extract_table_or_text(img, force_text=force_text, force_table=force_table)
 
        if mode == "table" and hasattr(result, "values"):
            text_out = result.to_csv(sep="\t", index=False, header=False)
        else:
            text_out = " ".join(result) if isinstance(result, (list, tuple)) else str(result)
 
        return [{"file_name": file_name, "file_path": file_path, "image_number": 1, "mode": mode, "full_text": text_out, "status": "ok"}]
 
    except Exception as e:
        logger.exception("extract_text_from_image failed: %s", e)
        return [{"file_name": file_name, "file_path": file_path, "image_number": 1, "mode": None, "full_text": "", "status": "error", "error": str(e)}]