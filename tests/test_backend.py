import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.connection import Base, get_db
from backend.app.main import app
from ml.parser import extract_email, extract_phone, extract_skills, parse_resume_text
from ml.scoring import calculate_tfidf_similarity, calculate_skill_overlap

# Setup test database (SQLite)
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# ----------------- PARSER TESTS -----------------

def test_extract_email():
    text = "Hello, my email is test.user@example.com, feel free to contact."
    assert extract_email(text) == "test.user@example.com"
    
    text_none = "No email here."
    assert extract_email(text_none) == "Email Not Found"

def test_extract_phone():
    text = "Call me at +1-555-019-2834 or work."
    assert extract_phone(text) == "+1-555-019-2834"
    
    text_none = "No phone details."
    assert extract_phone(text_none) == "Phone Not Found"

def test_extract_skills():
    text = "Experienced in Python programming, Javascript development, AWS, and Docker containers."
    skills = extract_skills(text)
    assert "python" in skills
    assert "javascript" in skills
    assert "aws" in skills
    assert "docker" in skills
    assert "java" not in skills  # Avoid partial match collisions

def test_parse_resume_text():
    resume_text = (
        "John Doe\n"
        "john.doe@gmail.com | 123-456-7890\n\n"
        "EDUCATION\n"
        "B.S. in Computer Science - Stanford University\n\n"
        "EXPERIENCE\n"
        "Software Engineer at Google\n"
        "Developed Python backends and Javascript frontend tools.\n\n"
        "PROJECTS\n"
        "Built React database search engines using Docker.\n"
    )
    result = parse_resume_text(resume_text)
    assert result["contact_info"]["name"] == "John Doe"
    assert result["contact_info"]["email"] == "john.doe@gmail.com"
    assert "python" in result["skills"]
    assert "react" in result["skills"]
    assert result["completeness_score"] > 50

# ----------------- SCORING TESTS -----------------

def test_calculate_tfidf_similarity():
    doc1 = "Python developer building cloud web apps in AWS"
    doc2 = "Python developer building cloud web apps in AWS"
    doc3 = "Java programmer doing corporate systems migrations"
    
    sim1 = calculate_tfidf_similarity(doc1, doc2)
    sim2 = calculate_tfidf_similarity(doc1, doc3)
    
    assert sim1 > 0.9  # Identical texts
    assert sim1 > sim2 # Similar texts score higher than completely different ones

def test_calculate_skill_overlap():
    resume_skills = ["python", "javascript", "react", "docker"]
    jd_text = "Looking for a React developer with Python and Postgres skills"
    
    overlap = calculate_skill_overlap(resume_skills, jd_text)
    assert "react" in overlap["matched_skills"]
    assert "python" in overlap["matched_skills"]
    assert "postgres" in overlap["missing_skills"]
    assert overlap["score"] == 2/3  # Matches: python, react. Missing: postgres.

# ----------------- API ENDPOINTS TESTS -----------------

def test_auth_signup_and_login():
    # Attempt signup
    signup_payload = {"email": "user@example.com", "password": "securepassword"}
    response = client.post("/api/auth/signup", json=signup_payload)
    assert response.status_code == 201
    assert response.json()["email"] == "user@example.com"
    
    # Attempt duplicate signup
    dup_response = client.post("/api/auth/signup", json=signup_payload)
    assert dup_response.status_code == 400
    
    # Attempt login
    login_payload = "username=user@example.com&password=securepassword"
    login_response = client.post(
        "/api/auth/login",
        data=login_payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
    assert login_response.json()["token_type"] == "bearer"
