import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Resume, User
from backend.app.auth import get_current_user
from backend.app.schemas import ResumeResponse
from ml.ocr import extract_text_from_pdf
from ml.parser import parse_resume_text

router = APIRouter(prefix="/resumes", tags=["Resumes"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify file is PDF
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )
        
    # Save file locally
    # To prevent overwrites with same filenames, prepend user_id and timestamp/increment
    import uuid
    unique_filename = f"{current_user.id}_{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}"
        )
        
    try:
        # Extract text using PyMuPDF / OCR
        raw_text = extract_text_from_pdf(file_path)
        
        # Parse extracted text with spaCy/rules
        parsed_metadata = parse_resume_text(raw_text)
        
        # Save to database
        new_resume = Resume(
            user_id=current_user.id,
            filename=file.filename,
            file_url=file_path,
            raw_text=raw_text,
            extracted_metadata=parsed_metadata
        )
        db.add(new_resume)
        db.commit()
        db.refresh(new_resume)
        
        return new_resume
        
    except Exception as e:
        # Cleanup file if processing failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process and parse resume: {str(e)}"
        )

@router.get("/", response_model=List[ResumeResponse])
def list_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).all()
    return resumes

@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or access denied."
        )
    return resume

@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or access denied."
        )
        
    # Delete local file if it exists
    if resume.file_url and os.path.exists(resume.file_url):
        try:
            os.remove(resume.file_url)
        except Exception:
            pass
            
    db.delete(resume)
    db.commit()
    return
