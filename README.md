# Anvil.pr

Anvil.pr is a prompt engineering lifecycle management app. It lets you create projects, add prompts inside those projects, and save immutable prompt versions over time. It also features a robust multi-model evaluation engine and a beautiful investor-ready comparison dashboard to systematically track prompt quality improvements.

The project is split into a FastAPI backend and a Next.js frontend.

## Features

- **Project & Prompt Management**: Create, list, and organize projects and prompts.
- **Version Control**: Edit prompt content and save each change as a new, immutable version.
- **Dataset Management**: Upload CSV datasets of sample inputs/outputs.
- **Multi-Model Evaluation**: Run datasets against prompt versions using unified models via LiteLLM (OpenAI, Groq, etc.).
- **Automated Quality Scoring**:
  - **Semantic Scoring**: Uses local SentenceTransformers (`all-MiniLM-L6-v2`) to judge output similarity.
  - **LLM Judge**: Automatically scores response quality on a 1-10 scale and checks for instruction following (e.g. JSON format, bullet points).
- **Comparison Dashboard**: A beautiful, auto-generated dashboard built with Recharts to visualize accuracy trends, latency, and cost across versions.
- **Automatic Seeding**: Includes a `seed.py` script that automatically provisions a demo-ready "Medical Chatbot" project upon startup.

## Tech Stack

### Backend
- Python 3.11+
- FastAPI & Uvicorn
- SQLAlchemy & SQLite
- LiteLLM (for unified model API calls)
- SentenceTransformers (for local semantic scoring)

### Frontend
- Next.js (App Router)
- React & TypeScript
- Tailwind CSS & Radix UI (shadcn/ui)
- Recharts (for dashboard visualizations)
- Lucide React icons

## Getting Started

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- npm
- OpenAI / Groq API Keys (for live evaluation runs)

### Quick Start (Windows)

Simply run the provided startup script from the root directory:

```powershell
.\start.ps1
```

This will:
1. Copy `.env.example` to `.env` in the backend (if missing).
2. Run the `seed.py` script to generate the demo Medical Chatbot project (if not already seeded).
3. Start the FastAPI backend on port 8000.
4. Install frontend dependencies (if missing) and start the Next.js app on port 3000.

### Manual Setup

#### 1. Set Up the Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python seed.py # (Optional) Seed the demo project
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API will run at `http://localhost:8000`.
- API docs: `http://localhost:8000/docs`

#### 2. Set Up the Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:3000`.

## Environment Variables

Create `backend/.env` (or let `start.ps1` copy it from `.env.example`). 
For live evaluation runs, you must provide your API keys:

```env
DATABASE_URL=sqlite:///./anvil.db
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
```

## Architecture Notes

- **Database Generation**: Tables are created automatically when the FastAPI app starts or when the seed script runs.
- **Append-Only Versions**: Prompt versions are append-only. Editing a prompt and saving creates a new version instead of overwriting an existing one.
- **Idempotent Seeding**: The `seed.py` script checks if the "Medical Chatbot" project exists; if it does, it safely skips generating duplicate data.
