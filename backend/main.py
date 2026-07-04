"""
main.py — Anvil.pr FastAPI application.

Endpoints:
  GET  /health
  POST /projects
  GET  /projects
  GET  /projects/{id}
  POST /projects/{id}/prompts
  GET  /projects/{id}/prompts
  PATCH /prompts/{id}
  POST /prompts/{id}/versions
  GET  /prompts/{id}/versions
  POST /projects/{id}/datasets  (multipart CSV upload)
  GET  /projects/{id}/datasets
  GET  /datasets/{id}
"""
import io

import pandas as pd
from fastapi import FastAPI, Depends, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import engine, get_db
import models
import schemas

# ---------------------------------------------------------------------------
# Create all tables on startup
# ---------------------------------------------------------------------------
models.Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Anvil.pr API",
    description="Prompt Engineering Lifecycle Management — backend API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", tags=["meta"])
def health_check():
    """Returns API status. Used by the frontend for connectivity verification."""
    return {"status": "ok", "service": "anvil-pr-api", "version": "0.1.0"}


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

@app.post(
    "/projects",
    response_model=schemas.ProjectRead,
    status_code=status.HTTP_201_CREATED,
    tags=["projects"],
)
def create_project(body: schemas.ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project."""
    project = models.Project(name=body.name.strip())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.get(
    "/projects",
    response_model=list[schemas.ProjectRead],
    tags=["projects"],
)
def list_projects(db: Session = Depends(get_db)):
    """Return all projects, newest first."""
    return (
        db.query(models.Project)
        .order_by(models.Project.created_at.desc())
        .all()
    )


@app.get(
    "/projects/{project_id}",
    response_model=schemas.ProjectRead,
    tags=["projects"],
)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Return a single project by ID."""
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

@app.post(
    "/projects/{project_id}/prompts",
    response_model=schemas.PromptRead,
    status_code=status.HTTP_201_CREATED,
    tags=["prompts"],
)
def create_prompt(
    project_id: int,
    body: schemas.PromptCreate,
    db: Session = Depends(get_db),
):
    """Create a new prompt inside a project."""
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    prompt = models.Prompt(project_id=project_id, name=body.name.strip())
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@app.get(
    "/projects/{project_id}/prompts",
    response_model=list[schemas.PromptRead],
    tags=["prompts"],
)
def list_prompts(project_id: int, db: Session = Depends(get_db)):
    """Return all prompts for a project, newest first."""
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return (
        db.query(models.Prompt)
        .filter(models.Prompt.project_id == project_id)
        .order_by(models.Prompt.created_at.desc())
        .all()
    )


@app.patch(
    "/prompts/{prompt_id}",
    response_model=schemas.PromptRead,
    tags=["prompts"],
)
def update_prompt(
    prompt_id: int,
    body: schemas.PromptUpdate,
    db: Session = Depends(get_db),
):
    """Update a prompt's name."""
    prompt = db.get(models.Prompt, prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    prompt.name = body.name.strip()
    db.commit()
    db.refresh(prompt)
    return prompt


# ---------------------------------------------------------------------------
# Prompt Versions
# ---------------------------------------------------------------------------

@app.post(
    "/prompts/{prompt_id}/versions",
    response_model=schemas.VersionRead,
    status_code=status.HTTP_201_CREATED,
    tags=["versions"],
)
def create_version(
    prompt_id: int,
    body: schemas.VersionCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new prompt version.
    version_number auto-increments per prompt (1-based).
    Never overwrites an existing version.
    """
    prompt = db.get(models.Prompt, prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    max_version = (
        db.query(func.max(models.PromptVersion.version_number))
        .filter(models.PromptVersion.prompt_id == prompt_id)
        .scalar()
    )
    next_version = (max_version or 0) + 1

    version = models.PromptVersion(
        prompt_id=prompt_id,
        version_number=next_version,
        content=body.content,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@app.get(
    "/prompts/{prompt_id}/versions",
    response_model=list[schemas.VersionRead],
    tags=["versions"],
)
def list_versions(prompt_id: int, db: Session = Depends(get_db)):
    """Return all versions for a prompt, newest first."""
    prompt = db.get(models.Prompt, prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return (
        db.query(models.PromptVersion)
        .filter(models.PromptVersion.prompt_id == prompt_id)
        .order_by(models.PromptVersion.version_number.desc())
        .all()
    )


# ---------------------------------------------------------------------------
# Datasets
# ---------------------------------------------------------------------------

REQUIRED_COLUMNS = {"input", "expected_output"}


@app.post(
    "/projects/{project_id}/datasets",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.DatasetList,
    tags=["datasets"],
)
async def upload_dataset(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a CSV dataset for a project.
    The CSV must have exactly the columns: input, expected_output (case-insensitive).
    Returns 400 with a descriptive error if columns don't match.
    """
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")

    # Normalise column names: strip whitespace + lowercase
    df.columns = [c.strip().lower() for c in df.columns]
    found = set(df.columns.tolist())

    if found != REQUIRED_COLUMNS:
        missing = sorted(REQUIRED_COLUMNS - found)
        extra = sorted(found - REQUIRED_COLUMNS)
        parts = []
        if missing:
            parts.append(f"missing: {missing}")
        if extra:
            parts.append(f"unexpected: {extra}")
        raise HTTPException(
            status_code=400,
            detail=(
                f"CSV column mismatch. "
                f"Expected exactly ['input', 'expected_output'], "
                f"found {sorted(found)}. "
                + "; ".join(parts)
            ),
        )

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV has no data rows.")

    rows = df[["input", "expected_output"]].dropna().to_dict(orient="records")

    dataset = models.Dataset(
        project_id=project_id,
        name=file.filename,
        rows_json=rows,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return schemas.DatasetList(
        id=dataset.id,
        project_id=dataset.project_id,
        name=dataset.name,
        row_count=len(rows),
        created_at=dataset.created_at,
    )


@app.get(
    "/projects/{project_id}/datasets",
    response_model=list[schemas.DatasetList],
    tags=["datasets"],
)
def list_datasets(project_id: int, db: Session = Depends(get_db)):
    """List all datasets for a project (id, name, row count, created_at)."""
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    datasets = (
        db.query(models.Dataset)
        .filter(models.Dataset.project_id == project_id)
        .order_by(models.Dataset.created_at.desc())
        .all()
    )
    return [
        schemas.DatasetList(
            id=d.id,
            project_id=d.project_id,
            name=d.name,
            row_count=len(d.rows_json or []),
            created_at=d.created_at,
        )
        for d in datasets
    ]


@app.get(
    "/datasets/{dataset_id}",
    response_model=schemas.DatasetDetail,
    tags=["datasets"],
)
def get_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Return full dataset with all parsed rows (for preview)."""
    dataset = db.get(models.Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return schemas.DatasetDetail(
        id=dataset.id,
        project_id=dataset.project_id,
        name=dataset.name,
        rows=dataset.rows_json or [],
        created_at=dataset.created_at,
    )

