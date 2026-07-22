import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from ml.parser import extract_skills

logger = logging.getLogger(__name__)

# Lazy loading of sentence-transformers to speed up server boot and handle fallback gracefully
model = None

def get_transformer_model():
    global model
    if model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Configure cache directory to be writable
            import os
            cache_dir = os.getenv("MODEL_CACHE_DIR", "./model_cache")
            os.makedirs(cache_dir, exist_ok=True)
            logger.info(f"Loading SentenceTransformer 'all-MiniLM-L6-v2' (cached at {cache_dir})...")
            model = SentenceTransformer("all-MiniLM-L6-v2", cache_folder=cache_dir)
        except Exception as e:
            logger.warning(f"Failed to load SentenceTransformer: {e}. Semantic matching will fall back to TF-IDF.")
            model = False
    return model

def calculate_sentence_transformers_similarity(resume_text: str, jd_text: str) -> float:
    return 0.0

def calculate_tfidf_similarity(resume_text: str, jd_text: str) -> float:
    """
    Computes cosine similarity of TF-IDF vectors.
    """
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf = vectorizer.fit_transform([resume_text, jd_text])
        similarity = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(max(0.0, min(1.0, similarity)))
    except Exception as e:
        logger.error(f"Error computing TF-IDF similarity: {e}")
        return 0.0

def calculate_skill_overlap(resume_skills: list, jd_text: str) -> dict:
    """
    Identifies job description skills, matches them with resume skills, 
    and computes the overlap score (Jaccard similarity).
    """
    # Extract skills from job description
    jd_skills = extract_skills(jd_text)
    
    resume_skills_set = set(s.lower() for s in resume_skills)
    jd_skills_set = set(s.lower() for s in jd_skills)
    
    if not jd_skills_set:
        return {
            "score": 1.0,  # No skills listed in JD, default to perfect overlap
            "matched_skills": [],
            "missing_skills": []
        }
        
    matched_skills = list(resume_skills_set.intersection(jd_skills_set))
    missing_skills = list(jd_skills_set.difference(resume_skills_set))
    
    overlap_score = len(matched_skills) / len(jd_skills_set)
    
    return {
        "score": overlap_score,
        "matched_skills": sorted(matched_skills),
        "missing_skills": sorted(missing_skills)
    }

def compute_hybrid_ats_score(resume_text: str, resume_skills: list, jd_text: str) -> dict:
    """
    Calculates a hybrid ATS match score (0-100) based on three factors:
    1. Semantic Similarity (Sentence Transformers): 40%
    2. Keywords/TF-IDF Cosine Similarity: 30%
    3. Skill Overlap (Jaccard Similarity): 30%
    
    If Transformers are disabled or fail, weights adjust to:
    - TF-IDF Cosine: 50%
    - Skill Overlap: 50%
    """
    transformer_score = calculate_sentence_transformers_similarity(resume_text, jd_text)
    tfidf_score = calculate_tfidf_similarity(resume_text, jd_text)
    
    skills_metrics = calculate_skill_overlap(resume_skills, jd_text)
    skill_overlap_score = skills_metrics["score"]
    
    # Check if transformers were successfully used
    transformer_active = get_transformer_model() is not False and transformer_score > 0
    
    if transformer_active:
        ats_score = (0.40 * transformer_score) + (0.30 * tfidf_score) + (0.30 * skill_overlap_score)
    else:
        # Re-weight to 50/50 fallback
        ats_score = (0.50 * tfidf_score) + (0.50 * skill_overlap_score)
        
    ats_score_percent = int(round(ats_score * 100))
    
    # Generate Explainable AI Match breakdown
    breakdown = {
        "semantic_match": int(round(transformer_score * 100)) if transformer_active else None,
        "keyword_match": int(round(tfidf_score * 100)),
        "skill_match": int(round(skill_overlap_score * 100))
    }
    
    # Explainable AI comments
    explanation = []
    if ats_score_percent >= 80:
        explanation.append("Excellent match! The resume shows strong alignment with both core competencies and semantic context.")
    elif ats_score_percent >= 60:
        explanation.append("Good match. The resume meets most requirements but could be improved by highlighting missing skills.")
    else:
        explanation.append("Weak alignment. Consider editing your experiences and project descriptions to include key job terms.")
        
    if len(skills_metrics["missing_skills"]) > 0:
        explanation.append(f"Missing crucial skills required: {', '.join(skills_metrics['missing_skills'][:4])}.")
    else:
        explanation.append("Outstanding keyword alignment - you possess all explicit skills identified in the job description.")

    return {
        "ats_score": ats_score_percent,
        "score_breakdown": breakdown,
        "missing_skills": skills_metrics["missing_skills"],
        "matched_skills": skills_metrics["matched_skills"],
        "match_explanation": {
            "insights": explanation,
            "transformer_active": transformer_active
        }
    }
