# universal_extractor.py
import os
import uuid
import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

# your extractor imports
from .extractors import (
    ppt_extractor,
    pdf_extractor,
    docx_extractor,
    image_extractor,
    audio_extractor,
    video_extractor,
)

logger = logging.getLogger(__name__)

Result = List[Dict[str, Any]]

DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB, tune as needed

def _normalize(res: Any, file_name: str) -> Result:
    """Normalize extractor outputs to List[dict]."""
    if isinstance(res, list):
        return res
    if isinstance(res, dict):
        return [res]
    if isinstance(res, str):
        return [{"file_name": file_name, "full_text": res, "status": "ok"}]
    return [{"file_name": file_name, "full_text": "", "status": "ok"}]

def _error(file_name: str, msg: str) -> Result:
    return [{"file_name": file_name, "full_text": "", "status": "error", "error": msg}]

def universal_extractor(file_path: str, session_media_dir: Optional[str] = None, max_size: int = DEFAULT_MAX_FILE_SIZE) -> Result:
    p = Path(file_path)
    file_name = p.name

    # Basic validations
    if not p.exists():
        return _error(file_name, "file_not_found")
    if not p.is_file():
        return _error(file_name, "not_a_file")
    try:
        size = p.stat().st_size
    except Exception as e:
        logger.exception("stat failed")
        return _error(file_name, f"stat_failed: {e}")
    if size > max_size:
        return _error(file_name, f"file_too_large: {size} bytes")

    # Prepare isolated work dir
    base_dir = Path(session_media_dir) if session_media_dir else Path(tempfile.gettempdir())
    work_dir = base_dir / f"extract_{uuid.uuid4().hex}"
    work_dir.mkdir(parents=True, exist_ok=True)

    ext = "".join(p.suffixes).lower() if len(p.suffixes) > 1 else p.suffix.lower()  # handle .tar.gz style if needed
    try:
        # mapping of extension sets to functions (you can extend)
        if ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".gif"]:
            try:
                out = image_extractor.extract_text_from_image(str(p))
                return _normalize(out, file_name)
            except Exception as e:
                logger.exception("image extraction failed")
                return _error(file_name, f"image_extractor_failed: {e}")

        if ext == ".pdf":
            try:
                out = pdf_extractor.extract_text_from_pdf(str(p))
                # if empty, you might want OCR fallback
                return _normalize(out, file_name)
            except Exception as e:
                logger.exception("pdf extraction failed")
                return _error(file_name, f"pdf_extractor_failed: {e}")

        if ext == ".docx":
            try:
                out = docx_extractor.extract_text_from_docx(str(p))
                return _normalize(out, file_name)
            except Exception as e:
                logger.exception("docx extraction failed")
                return _error(file_name, f"docx_extractor_failed: {e}")

        if ext == ".pptx":
            try:
                img_texts = ppt_extractor.extract_and_segregate_media(str(p), output_base_dir=str(work_dir))
                out = ppt_extractor.extract_presentation_content(str(p), img_texts)
                return _normalize(out, file_name)
            except Exception as e:
                logger.exception("pptx extraction failed")
                return _error(file_name, f"ppt_extractor_failed: {e}")

        if ext in [".mp3", ".wav", ".aac", ".ogg", ".m4a"]:
            try:
                out = audio_extractor.extract_audio(str(p))
                return _normalize(out, file_name)
            except Exception as e:
                logger.exception("audio extraction failed")
                return _error(file_name, f"audio_extractor_failed: {e}")

        if ext in [".mp4", ".mov", ".avi", ".wmv", ".mkv"]:
            try:
                out = video_extractor.extract_video(str(p))
                return _normalize(out, file_name)
            except Exception as e:
                logger.exception("video extraction failed")
                return _error(file_name, f"video_extractor_failed: {e}")

        if ext == ".txt":
            try:
                with p.open("r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
                return [{"file_name": file_name, "full_text": text, "status": "ok"}]
            except Exception as e:
                logger.exception("txt read failed")
                return _error(file_name, f"txt_read_failed: {e}")

        # fallback - try to guess content or return unsupported
        try:
            with p.open("r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            return [{"file_name": file_name, "full_text": text, "status": "ok"}]
        except Exception:
            return _error(file_name, f"unsupported_file_type: {ext}")

    finally:
        # optionally clean up work_dir if you want
        pass



# import os
# from .extractors import ppt_extractor, pdf_extractor, docx_extractor, image_extractor, audio_extractor, video_extractor

# def universal_extractor(file_path, session_media_dir):
#     ext = os.path.splitext(file_path)[1].lower()

#     if ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".gif"]:
#         return image_extractor.extract_text_from_image(file_path)

#     elif ext == ".pdf":
#         return pdf_extractor.extract_text_from_pdf(file_path)

#     elif ext == ".docx":
#         return docx_extractor.extract_text_from_docx(file_path)

#     elif ext == ".pptx":
#         img_texts = ppt_extractor.extract_and_segregate_media(file_path, output_base_dir=session_media_dir)
#         return ppt_extractor.extract_presentation_content(file_path, img_texts)

#     elif ext in [".mp3", ".wav", ".aac", ".ogg", ".m4a"]:
#         return audio_extractor.extract_audio(file_path)

#     elif ext in [".mp4", ".mov", ".avi", ".wmv", ".mkv"]:
#         return video_extractor.extract_video(file_path)

#     elif ext == ".txt":
#         try:
#             with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
#                 text = f.read()
#             return [{"file_name": os.path.basename(file_path), "full_text": text}]
#         except Exception as _e:
#             return [{"file_name": os.path.basename(file_path), "full_text": ""}]
#     else:
#         # Fallback: treat as generic binary/text; attempt text decode
#         try:
#             with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
#                 text = f.read()
#             return [{"file_name": os.path.basename(file_path), "full_text": text}]
#         except Exception:
#             return [{"file_name": os.path.basename(file_path), "full_text": f"Unsupported file type: {ext}"}]
