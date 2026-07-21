import os
import spacy
import logging
import subprocess
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.connection import engine, Base
from app.routes import auth, resumes, analysis, dashboard

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Auto-download spaCy model on startup if not available
try:
    spacy.load("en_core_web_sm")
    logger.info("spaCy model 'en_core_web_sm' is already installed.")
except OSError:
    logger.info("spaCy model 'en_core_web_sm' not found. Downloading...")
    subprocess.run(["python3", "-m", "spacy", "download", "en_core_web_sm"], check=True)

# Initialize database schemas
try:
    logger.info("Initializing database schemas...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully.")
except Exception as e:
    logger.error(f"Failed to auto-create schemas: {e}. Ensure DATABASE_URL is configured.")

# Initialize FastAPI App
app = FastAPI(
    title="AI Resume Analyzer API",
    description="Backend API for parsing resumes with OCR/NER and hybrid match analysis.",
    version="1.0.0"
)

# CORS configurations
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "AI Resume Analyzer Backend",
        "version": "1.0.0"
    }
