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
import time
import json
import re

import litellm
import pandas as pd
from sentence_transformers import SentenceTransformer, util
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
        "https://anvil-pr.onrender.com",
        "https://anvil-pr-five.vercel.app",
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


@app.get(
    "/prompts/{prompt_id}",
    response_model=schemas.PromptRead,
    tags=["prompts"],
)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    """Return a single prompt by ID."""
    prompt = db.get(models.Prompt, prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt


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


# ---------------------------------------------------------------------------
# Evaluations
# ---------------------------------------------------------------------------

PRICE_TABLE = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "groq/llama-3.1-8b-instant": {"input": 0.05, "output": 0.08}
}

print("Loading sentence-transformers model...")
similarity_model = SentenceTransformer("all-MiniLM-L6-v2")

def compute_similarity(expected: str, actual: str) -> float:
    if not expected or not actual:
        return 0.0
    emb1 = similarity_model.encode(expected, convert_to_tensor=True)
    emb2 = similarity_model.encode(actual, convert_to_tensor=True)
    sim = util.cos_sim(emb1, emb2).item()
    return max(0.0, sim) * 100

def run_llm_judge(expected_output: str, actual_output: str) -> dict:
    prompt = f"""You are evaluating an AI response for accuracy and helpfulness.

Expected output: {expected_output}
Actual output: {actual_output}

Score the actual output from 1-10 on how well it matches the intent and quality of the expected output. Respond ONLY with valid JSON in this exact format, no other text:
{{"score": <int 1-10>, "reasoning": "<one sentence>"}}"""
    
    try:
        response = litellm.completion(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        content = response.choices[0].message.content or ""
        cleaned = re.sub(r'^```[a-zA-Z]*\n|```$', '', content.strip(), flags=re.MULTILINE).strip()
        parsed = json.loads(cleaned)
        return {
            "score": int(parsed.get("score", 0)) if parsed.get("score") is not None else None,
            "reasoning": str(parsed.get("reasoning", ""))
        }
    except Exception as e:
        return {
            "score": None,
            "reasoning": "Failed to parse judge response"
        }

def check_instruction_following(prompt_content: str, output: str) -> dict:
    rules_applied = 0
    rules_passed = 0
    results = {}
    
    content_lower = prompt_content.lower()
    
    # Check JSON
    if "json" in content_lower:
        rules_applied += 1
        try:
            cleaned = re.sub(r'^```[a-zA-Z]*\n|```$', '', output.strip(), flags=re.MULTILINE).strip()
            json.loads(cleaned)
            results["json"] = True
            rules_passed += 1
        except:
            results["json"] = False
            
    # Check bullet points
    if "bullet point" in content_lower or "bullet points" in content_lower:
        rules_applied += 1
        if re.search(r'(?m)^[-*]\s', output) or re.search(r'(?m)^\d+\.\s', output):
            results["bullet_points"] = True
            rules_passed += 1
        else:
            results["bullet_points"] = False
            
    # Check X words or less
    words_match = re.search(r'(\d+) words or less', content_lower)
    if words_match:
        rules_applied += 1
        limit = int(words_match.group(1))
        words_count = len(output.split())
        if words_count <= limit:
            results["word_limit"] = True
            rules_passed += 1
        else:
            results["word_limit"] = False
            
    score = (rules_passed / rules_applied * 100) if rules_applied > 0 else None
    return {"passed": results, "score": score}

@app.post(
    "/evaluate",
    response_model=list[schemas.EvaluationRunRead],
    tags=["evaluations"],
)
def run_evaluation(body: schemas.EvaluationRequest, db: Session = Depends(get_db)):
    """Run an evaluation for a prompt version across a dataset and models."""
    version = db.get(models.PromptVersion, body.version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Prompt version not found")

    dataset = db.get(models.Dataset, body.dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if not dataset.rows_json:
        raise HTTPException(status_code=400, detail="Dataset is empty")
        
    created_runs = []
    
    for model_name in body.models:
        results = []
        total_latency_ms = 0
        total_cost_usd = 0
        
        valid_rows_for_accuracy = 0
        total_accuracy_sum = 0.0
        
        for row in dataset.rows_json:
            input_text = row.get("input", "")
            expected_output = row.get("expected_output", "")
            
            final_prompt = f"{version.content}\n\nInput:\n{input_text}"
            
            start_time = time.perf_counter()
            error_msg = None
            output_text = ""
            cost_usd = 0.0
            latency_ms = 0.0
            
            semantic_score = None
            judge_score = None
            judge_reasoning = None
            inst_score = None
            inst_results = None
            
            try:
                response = litellm.completion(
                    model=model_name,
                    messages=[{"role": "user", "content": final_prompt}]
                )
                output_text = response.choices[0].message.content or ""
                
                # Calculate cost
                usage = response.usage
                if usage and model_name in PRICE_TABLE:
                    prices = PRICE_TABLE[model_name]
                    prompt_tokens = usage.prompt_tokens
                    completion_tokens = usage.completion_tokens
                    cost_usd = (prompt_tokens / 1_000_000) * prices["input"] + (completion_tokens / 1_000_000) * prices["output"]
                    
                # Quality Scoring
                semantic_score = compute_similarity(expected_output, output_text)
                judge_res = run_llm_judge(expected_output, output_text)
                judge_score = judge_res["score"]
                judge_reasoning = judge_res["reasoning"]
                
                inst_res = check_instruction_following(version.content, output_text)
                inst_score = inst_res["score"]
                inst_results = inst_res["passed"]
                
                # Accuracy tracking
                row_accuracy_sum = 0
                components = 0
                if semantic_score is not None:
                    row_accuracy_sum += semantic_score
                    components += 1
                if judge_score is not None:
                    row_accuracy_sum += (judge_score * 10)
                    components += 1
                
                if components > 0:
                    total_accuracy_sum += (row_accuracy_sum / components)
                    valid_rows_for_accuracy += 1
                    
            except Exception as e:
                error_msg = str(e)
                
            latency_ms = (time.perf_counter() - start_time) * 1000
            total_latency_ms += latency_ms
            total_cost_usd += cost_usd
            
            results.append({
                "input": input_text,
                "expected_output": expected_output,
                "model": model_name,
                "output": output_text,
                "latency_ms": latency_ms,
                "cost_usd": cost_usd,
                "error": error_msg,
                "semantic_score": semantic_score,
                "judge_score": judge_score,
                "judge_reasoning": judge_reasoning,
                "instruction_following_score": inst_score,
                "instruction_following_results": inst_results
            })
            
        avg_latency_ms = total_latency_ms / len(dataset.rows_json)
        avg_cost_usd = total_cost_usd / len(dataset.rows_json)
        avg_accuracy = (total_accuracy_sum / valid_rows_for_accuracy) if valid_rows_for_accuracy > 0 else None
        
        run = models.EvaluationRun(
            version_id=version.id,
            dataset_id=dataset.id,
            model=model_name,
            results_json=results,
            avg_latency_ms=avg_latency_ms,
            avg_cost_usd=avg_cost_usd,
            avg_accuracy=avg_accuracy
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        created_runs.append(run)
        
    return created_runs


@app.get(
    "/evaluations/{version_id}",
    response_model=list[schemas.EvaluationRunRead],
    tags=["evaluations"],
)
def get_evaluations(version_id: int, db: Session = Depends(get_db)):
    """Get evaluation runs for a given prompt version."""
    version = db.get(models.PromptVersion, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Prompt version not found")
        
    return (
        db.query(models.EvaluationRun)
        .filter(models.EvaluationRun.version_id == version_id)
        .order_by(models.EvaluationRun.created_at.desc())
        .all()
    )


@app.get(
    "/prompts/{prompt_id}/comparison",
    response_model=list[schemas.PromptComparisonRow],
    tags=["evaluations"],
)
def get_prompt_comparison(prompt_id: int, db: Session = Depends(get_db)):
    """Return the most recent evaluation run per model for every version of a prompt."""
    prompt = db.get(models.Prompt, prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    versions = db.query(models.PromptVersion).filter(models.PromptVersion.prompt_id == prompt_id).order_by(models.PromptVersion.version_number.asc()).all()
    if not versions:
        return []
        
    version_ids = [v.id for v in versions]
    version_map = {v.id: v.version_number for v in versions}

    runs = db.query(models.EvaluationRun).filter(models.EvaluationRun.version_id.in_(version_ids)).order_by(models.EvaluationRun.created_at.desc()).all()

    seen = set()
    comparison_rows = []
    
    for run in runs:
        key = (run.version_id, run.model)
        if key not in seen:
            seen.add(key)
            comparison_rows.append({
                "version_number": version_map[run.version_id],
                "model": run.model,
                "avg_accuracy": run.avg_accuracy,
                "avg_latency_ms": run.avg_latency_ms,
                "avg_cost_usd": run.avg_cost_usd,
                "created_at": run.created_at,
            })
            
    comparison_rows.sort(key=lambda x: (x["version_number"], x["model"]))
    return comparison_rows
