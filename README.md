# Anvil.pr

Anvil.pr is a prompt engineering lifecycle management app. It lets you create projects, add prompts inside those projects, and save immutable prompt versions over time.

The project is split into a FastAPI backend and a Next.js frontend.

## Features

- Create and list projects
- Create, list, and rename prompts inside a project
- Edit prompt content and save each change as a new version
- Browse prompt version history
- SQLite database by default, with support for another SQLAlchemy database URL
- FastAPI OpenAPI docs available locally

## Tech Stack

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic v2
- SQLite by default
- Uvicorn

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Radix UI primitives
- Lucide React icons

## Project Structure

```text
.
+-- backend/
|   +-- database.py        # SQLAlchemy engine and session setup
|   +-- main.py            # FastAPI app and API routes
|   +-- models.py          # SQLAlchemy ORM models
|   +-- requirements.txt   # Python dependencies
|   +-- schemas.py         # Pydantic request/response schemas
+-- frontend/
    +-- package.json       # Next.js scripts and dependencies
    +-- src/
    |   +-- app/           # App Router pages and layout
    |   +-- components/    # Reusable UI components
    |   +-- lib/           # API client and utilities
    +-- public/            # Static assets
```

## Getting Started

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- npm

### 1. Set Up the Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API will run at:

```text
http://localhost:8000
```

Useful backend URLs:

- Health check: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`
- OpenAPI schema: `http://localhost:8000/openapi.json`

By default, the backend creates a local SQLite database at `backend/anvil.db`.

### 2. Set Up the Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:

```text
http://localhost:3000
```

The frontend API client currently points to:

```text
http://localhost:8000
```

## Environment Variables

The backend loads environment variables from `.env`.

### Backend

Create `backend/.env` if you want to override the default database:

```env
DATABASE_URL=sqlite:///./anvil.db
```

For another database supported by SQLAlchemy, set `DATABASE_URL` accordingly.

## API Routes

### Meta

- `GET /health` - Check API status

### Projects

- `POST /projects` - Create a project
- `GET /projects` - List projects
- `GET /projects/{project_id}` - Get one project

### Prompts

- `POST /projects/{project_id}/prompts` - Create a prompt in a project
- `GET /projects/{project_id}/prompts` - List prompts for a project
- `PATCH /prompts/{prompt_id}` - Rename a prompt

### Versions

- `POST /prompts/{prompt_id}/versions` - Save a new prompt version
- `GET /prompts/{prompt_id}/versions` - List versions for a prompt

## Frontend Routes

- `/` - Redirects to `/projects`
- `/projects` - Project list and project creation
- `/projects/[id]` - Prompt list for a project
- `/prompts/[id]` - Prompt editor and version history

## Development Commands

### Backend

```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run start
npm run lint
```

## Notes

- Tables are created automatically when the FastAPI app starts.
- Prompt versions are append-only. Editing a prompt and saving creates a new version instead of overwriting an existing one.
- The current backend model includes datasets and evaluation runs, but the exposed API and UI currently focus on projects, prompts, and prompt versions.
