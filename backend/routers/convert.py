import os
import subprocess
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))   # backend/routers
BACKEND_DIR = os.path.dirname(BASE_DIR)                # backend

UPLOAD_DIR = os.path.join(BACKEND_DIR, "sessions")
CONVERTED_DIR = os.path.join(BACKEND_DIR, "converted_pdfs")
os.makedirs(CONVERTED_DIR, exist_ok=True)

LIBREOFFICE_PATH = r"C:\Program Files\LibreOffice\program\soffice.exe"

@router.get("/convert-ppt-to-pdf/{session_id}/{filename}")
async def convert_ppt_to_pdf(session_id: str, filename: str):
    session_path = os.path.join(UPLOAD_DIR, session_id)
    ppt_path = os.path.join(session_path, filename)

    if not os.path.exists(ppt_path):
        raise HTTPException(status_code=404, detail=f"PPT file not found in {session_path}")

    pdf_filename = f"{os.path.splitext(filename)[0]}.pdf"
    pdf_path = os.path.join(CONVERTED_DIR, pdf_filename)

    # Convert only if PDF does not exist already
    if not os.path.exists(pdf_path):
        try:
            subprocess.run(
                [
                    LIBREOFFICE_PATH,
                    "--headless",
                    "--convert-to", "pdf",
                    "--outdir", CONVERTED_DIR,
                    ppt_path
                ],
                check=True
            )
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    # ✅ Use StreamingResponse so browser renders inline in <iframe>
    def iterfile():
        with open(pdf_path, mode="rb") as file:
            yield from file

    return StreamingResponse(iterfile(), media_type="application/pdf")
