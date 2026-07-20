from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Resume, Analysis, User
from backend.app.auth import get_current_user
from backend.app.schemas import AnalysisCreate, AnalysisResponse
from ml.scoring import compute_hybrid_ats_score
from ml.suggestions import generate_local_suggestions, generate_llm_suggestions

router = APIRouter(prefix="/analysis", tags=["Analysis"])

@router.post("/analyze", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_resume(
    payload: AnalysisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch user's resume
    resume = db.query(Resume).filter(Resume.id == payload.resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or access denied."
        )
        
    # Get extracted skills and raw text
    
    resume_skills = resume.extracted_metadata.get("skills", [])
    resume_text = resume.raw_text

    print("Resume Skills:", resume_skills)
    print("Extracted Metadata:", resume.extracted_metadata)
    
    # Calculate scores
    scoring_results = compute_hybrid_ats_score(resume_text, resume_skills, payload.job_description)
    
    # Generate suggestions (pluggable LLM first, local fallback second)
    llm_suggestions = generate_llm_suggestions(resume.extracted_metadata, payload.job_description)
    if llm_suggestions:
        suggestions = llm_suggestions
    else:
        # Fallback to local rule-based generator
        completeness_score = resume.extracted_metadata.get("completeness_score", 100)
        completeness_breakdown = resume.extracted_metadata.get("completeness_breakdown", {})
        suggestions = generate_local_suggestions(
            scoring_results["missing_skills"],
            completeness_score,
            completeness_breakdown,
            scoring_results["score_breakdown"]
        )
        
    # Store analysis report
    new_analysis = Analysis(
    user_id=current_user.id,
    resume_id=resume.id,
    job_description=payload.job_description,
    ats_score=scoring_results["ats_score"],
    score_breakdown=scoring_results["score_breakdown"],
    matched_skills=scoring_results["matched_skills"],
    missing_skills=scoring_results["missing_skills"],
    match_explanation=scoring_results["match_explanation"],
    suggestions=suggestions
)
    db.add(new_analysis)
    db.commit()
    db.refresh(new_analysis)
    
    return new_analysis

@router.get("/history", response_model=List[AnalysisResponse])
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = db.query(Analysis).filter(Analysis.user_id == current_user.id).order_by(Analysis.created_at.desc()).all()
    return history

@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id).first()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found or access denied."
        )
    return analysis

@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id).first()
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found or access denied."
        )
    db.delete(analysis)
    db.commit()
    return
