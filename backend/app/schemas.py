from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Dict, Any, Optional

# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Resume Schemas
class ContactInfo(BaseModel):
    name: str
    email: str
    phone: str

class ResumeMetadata(BaseModel):
    contact_info: ContactInfo
    skills: List[str]
    education: str
    experience: str
    certifications: str
    projects: str
    completeness_score: int
    completeness_breakdown: Dict[str, bool]

class ResumeResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    file_url: Optional[str] = None
    extracted_metadata: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# Analysis Schemas
class AnalysisCreate(BaseModel):
    resume_id: int
    job_description: str

class ScoreBreakdown(BaseModel):
    semantic_match: Optional[int] = None
    keyword_match: int
    skill_match: int

class MatchExplanation(BaseModel):
    insights: List[str]
    transformer_active: bool

class AnalysisResponse(BaseModel):
    id: int
    user_id: int
    resume_id: int
    job_description: str
    ats_score: float
    score_breakdown: Dict[str, Any]

    matched_skills: List[str]

    missing_skills: List[str]
    match_explanation: Dict[str, Any]
    suggestions: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard Stats Schemas
class DashboardStatsResponse(BaseModel):
    average_ats_score: float
    total_resumes: int
    total_analyses: int
    skill_distribution: Dict[str, int]
    recent_analyses: List[AnalysisResponse]
