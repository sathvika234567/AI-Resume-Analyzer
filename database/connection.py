import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "postgresql://sathvikaajmeera@localhost:5432/resume_analyzer"

# Fallback to SQLite locally if postgres url is not configured to make local dev seamless
if DATABASE_URL.startswith("postgres://"):
    # Fix for Render/Heroku which uses postgres:// instead of postgresql://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
