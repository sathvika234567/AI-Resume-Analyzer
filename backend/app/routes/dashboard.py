from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import Counter

from database.connection import get_db
from database.models import Resume, Analysis, User
from app.auth import get_current_user
from app.schemas import DashboardStatsResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Total counts
    total_resumes = db.query(Resume).filter(Resume.user_id == current_user.id).count()
    
    analyses_query = db.query(Analysis).filter(Analysis.user_id == current_user.id)
    total_analyses = analyses_query.count()
    
    # 2. Average ATS score
    avg_score = 0.0
    if total_analyses > 0:
        scores = [a.ats_score for a in analyses_query.all()]
        avg_score = sum(scores) / len(scores)
        
    # 3. Recent Analyses (last 5)
    recent_analyses = analyses_query.order_by(Analysis.created_at.desc()).limit(5).all()
    
    # 4. Skill Distribution frequency calculation
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    all_skills = []
    for r in resumes:
        skills = r.extracted_metadata.get("skills", [])
        all_skills.extend(skills)
        
    skill_counts = dict(Counter(all_skills).most_common(12))  # top 12 skills
    
    return {
        "average_ats_score": round(avg_score, 1),
        "total_resumes": total_resumes,
        "total_analyses": total_analyses,
        "skill_distribution": skill_counts,
        "recent_analyses": recent_analyses
    }
