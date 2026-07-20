# Production-Ready AI Resume Analyzer

An advanced, production-grade AI-powered web platform designed to analyze resume PDFs against target job descriptions. The system parses PDF assets (supporting text-based and scanned PDFs via Tesseract OCR fallback), extracts key named entities (Name, Contact Details, Skills, Education, Experience, Certifications, Projects), computes a hybrid similarity match, and renders a visually stunning, responsive analytics dashboard.

---

## Architecture Design

The application follows a modular, clean-layered architecture:

```mermaid
graph TD
    Client[React Frontend - Vercel / Port 80] -->|HTTPS Requests / JWT Auth| API[FastAPI Gateway - Render / Port 8000]
    API -->|Read / Write Records| DB[(PostgreSQL Database)]
    API -->|Raw PDF File / Uploads| OCR[OCR Processor - PyMuPDF & Tesseract]
    API -->|Extracted Text| NER[NER Extractor - SpaCy & Rule Matcher]
    API -->|Parsed Resume + Job Description| Scoring[Hybrid Scoring Engine]
    
    subgraph Machine Learning Pipeline
        OCR
        NER
        Scoring -->|Sentence Transformers| Embeddings[all-MiniLM-L6-v2]
        Scoring -->|Token Frequency| TFIDF[TF-IDF Vectorizer]
        Scoring -->|Keywords Match| Overlap[Jaccard Skill Overlap]
    end
```

---

## Core Technical Features

1. **Dual PDF Parsing & OCR Fallback**: Utilizes PyMuPDF for fast digital extraction. If the parsed string is empty or short, the system automatically runs a Tesseract OCR pipeline on converted pages to support scanned PDF documents.
2. **Named Entity Recognition (NER)**: A custom SpaCy parser combined with regex pattern matching rules to isolate contact info, technical skills, education records, certifications, and project sections.
3. **Hybrid Match Engine**: Evaluates relevance based on three weights:
   * **Semantic Similarity (40%)**: Sentence Transformers (`all-MiniLM-L6-v2`) segment cosine similarity.
   * **Keyword Density (30%)**: Cosine similarity of term frequencies using TF-IDF.
   * **Skills Overlap (30%)**: Jaccard index measuring matching vs. missing technical attributes.
4. **Explainable AI (XAI)**: Generates a clear section-by-section breakdown detailing why a score was assigned and highlighting missing skill gaps.
5. **Pluggable AI Suggestions**: Gracefully defaults to an offline, local rule-based recommendations engine, but can plug directly into Gemini or OpenAI APIs if environment variables are provided.

---

## Directory Structure

```
ai-resume-analyzer/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline
├── backend/                   # FastAPI gateway web server
│   ├── app/
│   │   ├── routes/            # Route controllers (auth, resumes, analysis, dashboard)
│   │   │   ├── auth.py
│   │   │   ├── resumes.py
│   │   │   ├── analysis.py
│   │   │   └── dashboard.py
│   │   ├── auth.py            # JWT token middleware
│   │   ├── schemas.py         # Pydantic validation schemas
│   │   └── main.py            # FastAPI entry point & spaCy downloader
│   ├── alembic/               # Database migrations folder
│   ├── Dockerfile             # Multi-stage production backend Dockerfile
│   └── requirements.txt       # Python dependencies
├── database/                  # Connection and schema layer
│   ├── connection.py          # SQLAlchemy engine & session factory
│   └── models.py              # PostgreSQL database models
├── ml/                        # Machine Learning and NLP models
│   ├── ocr.py                 # PyMuPDF & Tesseract OCR pipeline
│   ├── parser.py              # SpaCy entity and section extractor
│   ├── scoring.py             # Similarity calculation engine
│   └── suggestions.py         # Local / LLM recommendation generator
├── frontend/                  # React + Vite client app
│   ├── src/
│   │   ├── App.jsx            # Main app file
│   │   ├── index.css          # Tailwind CSS v4 entry point
│   │   └── main.jsx           # App bootstrap file
│   ├── vercel.json            # Vercel SPA routing configurations
│   ├── nginx.conf             # Nginx configuration for Docker serving
│   └── Dockerfile             # Multi-stage production frontend Dockerfile
├── tests/                     # Test suite
│   └── test_backend.py        # PyTest unit and endpoint tests
├── docker-compose.yml         # Local microservices orchestrator
├── render.yaml                # Render Blueprint specification
└── README.md                  # System Documentation
```

---

## Environment Variables Configuration

Create a `.env` file in the root or set these inside your cloud provider settings:

| Variable Name | Environment | Description | Default Value / Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Dev / Prod | Postgres connection string | `postgresql://postgres:postgres@localhost:5432/resume_analyzer` |
| `JWT_SECRET_KEY` | Dev / Prod | Cryptographic string for signing access tokens | `dev-super-secret-key-12345` |
| `CORS_ORIGINS` | Prod | Allowed origins for CORS (comma separated) | `https://your-frontend.vercel.app` |
| `MODEL_CACHE_DIR` | Dev / Prod | Local directory for storing transformer weights | `./model_cache` |
| `UPLOAD_DIR` | Dev / Prod | Local storage folder for uploaded resume PDFs | `./uploads` |
| `VITE_API_URL` | Frontend | Target API server base URL | `http://localhost:8000/api` |
| `GEMINI_API_KEY` | Pluggable | Optional API key to fetch advanced recommendations | `AIzaSy...` |
| `OPENAI_API_KEY`| Pluggable | Optional API key to fetch advanced recommendations | `sk-proj-...` |

---

## Installation & Setup

### Method 1: Local Docker Compose (Recommended)
This runs the entire stack (PostgreSQL, FastAPI Backend, React Frontend) locally without needing system installs for Tesseract, Python, or Node.

1. Ensure Docker Desktop is running.
2. Build and launch the containers:
   ```bash
   docker-compose up --build
   ```
3. Open `http://localhost` in your browser. The backend API is exposed at `http://localhost:8000`.

### Method 2: Manual Local Setup (Host Machine)
You must install system dependencies for OCR manually:
* **macOS**: `brew install tesseract poppler postgresql`
* **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr poppler-utils libpq-dev`

#### 1. Setup Backend:
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server (runs on port 8000):
   ```bash
   PYTHONPATH=.. uvicorn app.main:app --reload
   ```

#### 2. Setup Frontend:
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Access client at `http://localhost:5173`.

---

## Production Deployment

### 1. Backend on Render
We deploy the FastAPI backend using Docker to ensure Tesseract OCR dependencies are installed correctly.

1. Create a **New Blueprint Instance** on Render.
2. Link your Git repository. Render will automatically read the `render.yaml` configuration.
3. Replace the `CORS_ORIGINS` value in your Render dashboard environment variables with the URL of your Vercel frontend.
4. Render will deploy:
   * A hosted PostgreSQL instance.
   * A Docker Web Service exposing port 8000.
   * A 1GB persistent disk volume to cache Sentence Transformer weights.

### 2. Frontend on Vercel
We deploy the React frontend statically on Vercel.

1. Sign in to Vercel and create a **New Project**.
2. Select your Git repository.
3. Configure the **Build Settings**:
   * Build Command: `npm run build`
   * Output Directory: `dist`
4. Set the **Environment Variables**:
   * `VITE_API_URL`: Set this to your backend Render URL (e.g. `https://ats-resume-backend.onrender.com/api`).
5. Click **Deploy**. Vercel will build and host the static SPA using `vercel.json` routing rewrites.

---

## API Documentation

FastAPI automatically serves Swagger API documentation at `/docs` (e.g., `http://localhost:8000/docs`).

### Critical Endpoints
* **Auth**:
  * `POST /api/auth/signup`: Create a user account.
  * `POST /api/auth/login`: Authenticate and return JWT token.
* **Resumes**:
  * `POST /api/resumes/upload`: Upload a PDF resume, trigger OCR/NER extraction, and save.
  * `GET /api/resumes`: List all uploaded resumes for the user.
* **Analysis**:
  * `POST /api/analysis/analyze`: Match a resume against a job description.
  * `GET /api/analysis/history`: Retrieve past matching reports.
* **Dashboard**:
  * `GET /api/dashboard/stats`: Retrieve charts frequency lists and average scores.

---

## Troubleshooting & FAQ

* **OCR fails on local manual install**:
  Make sure `tesseract` and `poppler` are added to your system environment variables `PATH`. You can verify by running `tesseract --version` in your terminal.
* **Sentence Transformers downloading on every deploy**:
  Ensure you are using the Docker setup or have configured a persistent volume on Render mapped to the `MODEL_CACHE_DIR` directory.
* **CORS Errors**:
  Ensure `CORS_ORIGINS` env var on your backend includes the exact protocol and domain of your Vercel frontend (without trailing slash).
