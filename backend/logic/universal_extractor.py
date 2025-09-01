import os
from .extractors import ppt_extractor, pdf_extractor, docx_extractor, image_extractor, audio_extractor, video_extractor

def universal_extractor(file_path, session_media_dir):
    ext = os.path.splitext(file_path)[1].lower()

    if ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".gif"]:
        return image_extractor.extract_text_from_image(file_path)

    elif ext == ".pdf":
        return pdf_extractor.extract_text_from_pdf(file_path)

    elif ext == ".docx":
        return docx_extractor.extract_text_from_docx(file_path)

    elif ext == ".pptx":
        img_texts = ppt_extractor.extract_and_segregate_media(file_path, output_base_dir=session_media_dir)
        return ppt_extractor.extract_presentation_content(file_path, img_texts)

    elif ext in [".mp3", ".wav", ".aac", ".ogg", ".m4a"]:
        return audio_extractor.extract_audio(file_path)

    elif ext in [".mp4", ".mov", ".avi", ".wmv", ".mkv"]:
        return video_extractor.extract_video(file_path)

    else:
        return [{"file_name": os.path.basename(file_path), "full_text": f"Unsupported file type: {ext}"}]
