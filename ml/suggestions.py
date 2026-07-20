import os
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

def generate_local_suggestions(
    missing_skills: List[str], 
    completeness_score: int, 
    completeness_breakdown: Dict[str, bool],
    score_breakdown: Dict[str, int]
) -> Dict[str, List[str]]:
    """
    Offline local suggestion engine. Generates actionable feedback based on metrics and parsed gaps.
    """
    suggestions = {
        "skills": [],
        "experience": [],
        "projects_certs": [],
        "formatting": []
    }
    
    # 1. Skills recommendations
    if missing_skills:
        top_missing = missing_skills[:5]
        suggestions["skills"].append(
            f"Add missing core keywords: {', '.join(top_missing)} under your skills section if you possess experience with them."
        )
        suggestions["skills"].append(
            "Incorporate these missing skills naturally into your project descriptions or work experience achievements."
        )
    else:
        suggestions["skills"].append(
            "Great skill coverage! Your technical catalog closely matches the job description."
        )
        
    # 2. Experience tailing tips
    keyword_match_val = score_breakdown.get("keyword_match", 0)
    if keyword_match_val < 50:
        suggestions["experience"].append(
            "Review your job description bullets and rewrite them using active verbs and metrics (e.g., 'Increased efficiency by 20% using [Skill]')."
        )
        suggestions["experience"].append(
            "Tailor your experience to match the terminology used in the job description to improve TF-IDF frequency score."
        )
    else:
        suggestions["experience"].append(
            "Your professional experience shows good keyword alignment. Ensure achievements list exact project impacts."
        )
        
    # 3. Completeness details
    for section, exists in completeness_breakdown.items():
        if not exists:
            if section in ["Projects", "Certifications"]:
                suggestions["projects_certs"].append(
                    f"The {section} section was not identified. Adding personal projects or related professional certificates can boost ATS scoring."
                )
            elif section in ["Email", "Phone"]:
                suggestions["formatting"].append(
                    f"Your contact details are missing: {section}. Ensure your resume contains visible contact information at the top."
                )
                
    # 4. General formatting
    if completeness_score < 70:
        suggestions["formatting"].append(
            "Ensure you use a clean, single-column layout. Multi-column tables or textboxes can make parsing difficult for standard ATS scanners."
        )
    suggestions["formatting"].append(
        "Save your resume as a clean PDF (avoid scanned images of text) to ensure text can be parsed digitially."
    )
    
    return suggestions

def generate_llm_suggestions(resume_metadata: Dict[str, Any], jd_text: str) -> Dict[str, List[str]]:
    """
    Pluggable LLM suggestion engine. Attempts Gemini first, then OpenAI if configured.
    Falls back to offline suggestions if API keys are missing.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    prompt = (
        "You are an expert ATS (Applicant Tracking System) optimizer and career coach.\n"
        "Analyze the following parsed resume details and the job description, then generate actionable improvement recommendations.\n"
        "You must return ONLY a JSON object with the following structure:\n"
        "{\n"
        "  \"skills\": [\"tip 1\", \"tip 2\"],\n"
        "  \"experience\": [\"tip 1\", \"tip 2\"],\n"
        "  \"projects_certs\": [\"tip 1\", \"tip 2\"],\n"
        "  \"formatting\": [\"tip 1\", \"tip 2\"]\n"
        "}\n"
        f"Resume Parsed Data: {json.dumps(resume_metadata)}\n"
        f"Job Description: {jd_text}\n"
    )
    
    # Try Gemini
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            # Use gemini-1.5-flash or modern model
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            result_text = response.text.strip()
            
            # Clean JSON if wrapped in markdown codeblocks
            if result_text.startswith("```"):
                result_text = result_text.split("```json")[-1].split("```")[0].strip()
                
            return json.loads(result_text)
        except Exception as e:
            logger.error(f"Gemini suggestions generation failed: {e}. Trying OpenAI.")
            
    # Try OpenAI
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional resume writer that outputs JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            result_text = response.choices[0].message.content.strip()
            return json.loads(result_text)
        except Exception as e:
            logger.error(f"OpenAI suggestions generation failed: {e}.")
            
    # Fallback to local rule-based suggestions if no key works or if keys are missing
    return None
