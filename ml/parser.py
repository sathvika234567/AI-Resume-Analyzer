import re
import spacy
from typing import Dict, Any, List

# Load spaCy model. Try en_core_web_sm. If not downloaded, it will be downloaded inside Docker or on first runtime check.
nlp = None
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    # We will handle downloading or load gracefully
    pass

# Extensive Skills catalog for extraction matching
SKILLS_DB = {
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c", "c#", "ruby", "go", "rust", "php", "swift", "kotlin", "scala", "r", "sql", "html", "css", "bash", "shell", "dart",
    # Frontend
    "react", "angular", "vue", "next.js", "nuxt", "svelte", "jquery", "bootstrap", "tailwind", "tailwind css", "vite", "webpack", "redux",
    # Backend / Frameworks
    "django", "flask", "fastapi", "spring boot", "express", "express.js", "nest.js", "rails", "node.js", "node", "asp.net", "laravel",
    # Databases
    "postgresql", "postgres", "mysql", "sqlite", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "mariadb", "oracle", "neo4j",
    # Cloud & DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "git", "github", "gitlab", "jenkins", "terraform", "ansible", "docker-compose", "ci/cd", "circleci", "heroku", "netlify", "vercel",
    # ML & Data Science
    "machine learning", "deep learning", "nlp", "natural language processing", "computer vision", "pytorch", "tensorflow", "keras", "scikit-learn", "sklearn", "pandas", "numpy", "scipy", "matplotlib", "seaborn", "tableau", "power bi", "spacy", "nltk",
    # Concepts / Architecture
    "rest api", "graphql", "microservices", "agile", "scrum", "oop", "system design", "solid", "mvc", "test driven development", "tdd", "unit testing"
}

def clean_text(text: str) -> str:
    # Standard clean up
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_name(text: str) -> str:
    """
    Extract name using spaCy NER. Fallback to the first line of the document if no PERSON tag is found.
    """
    if nlp:
        doc = nlp(text[:1000])  # Scan first 1000 characters for speed
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                # Ensure the name looks valid (e.g., 2 or more words)
                name = ent.text.strip()
                if len(name.split()) >= 2 and not any(char.isdigit() for char in name):
                    return name
    
    # Fallback to the first non-empty line
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if lines:
        first_line = lines[0]
        # Ensure it doesn't look like a header or email
        if len(first_line.split()) >= 2 and "@" not in first_line and len(first_line) < 50:
            return first_line
            
    return "Name Not Found"

def extract_email(text: str) -> str:
    email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
    match = re.search(email_pattern, text)
    return match.group(0) if match else "Email Not Found"

def extract_phone(text: str) -> str:
    phone_pattern = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    match = re.search(phone_pattern, text)
    return match.group(0) if match else "Phone Not Found"

def extract_skills(text: str) -> List[str]:
    """
    Extract skills by scanning token matches against the SKILLS_DB dictionary.
    Supports single words and common multi-word phrases.
    """
    text_lower = text.lower()
    found_skills = set()
    
    # Simple word and phrase lookup
    for skill in SKILLS_DB:
        # Match using word boundaries to avoid sub-string collisions (e.g., "go" in "google")
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.add(skill)
            
    return sorted(list(found_skills))

def extract_sections(text: str) -> Dict[str, str]:
    """
    Extract raw text blocks for Education, Experience, Certifications, and Projects.
    Uses regex based on header keywords.
    """
    sections = {
        "education": "",
        "experience": "",
        "certifications": "",
        "projects": ""
    }
    
    # Header keywords
    headers = {
        "education": [r'education', r'academic background', r'academic qualifications', r'study'],
        "experience": [r'experience', r'work history', r'professional background', r'employment history', r'work experience'],
        "certifications": [r'certifications', r'certificates', r'credentials', r'courses'],
        "projects": [r'projects', r'personal projects', r'academic projects', r'technical projects']
    }
    
    # Standardize lines
    lines = text.split("\n")
    current_section = None
    section_buffer = {k: [] for k in sections.keys()}
    
    for line in lines:
        cleaned_line = line.strip().lower()
        if not cleaned_line:
            continue
            
        # Check if line matches any section header
        header_found = False
        for sec, patterns in headers.items():
            for pat in patterns:
                # Header lines are usually short and start with the keyword
                if re.match(r'^' + pat + r'\b', cleaned_line) and len(cleaned_line) < 30:
                    current_section = sec
                    header_found = True
                    break
            if header_found:
                break
                
        if header_found:
            continue
            
        if current_section:
            section_buffer[current_section].append(line)
            
    for sec in sections.keys():
        sections[sec] = "\n".join(section_buffer[sec]).strip()
        
    return sections

def parse_resume_text(text: str) -> Dict[str, Any]:
    """
    Main parser method that combines all extractions.
    """
    # Clean text first
    cleaned = clean_text(text)
    
    # Run extractions
    name = extract_name(text)
    email = extract_email(text)
    phone = extract_phone(text)
    skills = extract_skills(text)
    
    sections = extract_sections(text)
    
    # Compute Resume Completeness Score
    completeness_criteria = {
        "Name": name != "Name Not Found",
        "Email": email != "Email Not Found",
        "Phone": phone != "Phone Not Found",
        "Skills": len(skills) > 0,
        "Education": len(sections["education"]) > 0,
        "Experience": len(sections["experience"]) > 0,
        "Projects": len(sections["projects"]) > 0,
        "Certifications": len(sections["certifications"]) > 0
    }
    
    completed_count = sum(1 for v in completeness_criteria.values() if v)
    completeness_score = int((completed_count / len(completeness_criteria)) * 100)
    
    return {
        "contact_info": {
            "name": name,
            "email": email,
            "phone": phone
        },
        "skills": skills,
        "education": sections["education"],
        "experience": sections["experience"],
        "certifications": sections["certifications"],
        "projects": sections["projects"],
        "completeness_score": completeness_score,
        "completeness_breakdown": completeness_criteria
    }
