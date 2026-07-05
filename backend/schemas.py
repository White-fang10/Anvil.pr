"""
schemas.py — Pydantic v2 request/response models for Anvil.pr API.
"""
from datetime import datetime
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    name: str


class ProjectRead(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

class PromptCreate(BaseModel):
    name: str


class PromptUpdate(BaseModel):
    name: str


class PromptRead(BaseModel):
    id: int
    project_id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Prompt Version
# ---------------------------------------------------------------------------

class VersionCreate(BaseModel):
    content: str


class VersionRead(BaseModel):
    id: int
    prompt_id: int
    version_number: int
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------

class DatasetList(BaseModel):
    """Lightweight response for listing datasets (no rows included)."""
    id: int
    project_id: int
    name: str
    row_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetDetail(BaseModel):
    """Full dataset response including all parsed rows."""
    id: int
    project_id: int
    name: str
    rows: list[dict]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

class EvaluationRequest(BaseModel):
    version_id: int
    dataset_id: int
    models: list[str]


class EvaluationRunRead(BaseModel):
    id: int
    version_id: int
    dataset_id: int
    model: str
    results_json: list[dict]
    avg_accuracy: float | None = None
    avg_latency_ms: float | None = None
    avg_cost_usd: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PromptComparisonRow(BaseModel):
    version_number: int
    model: str
    avg_accuracy: float | None = None
    avg_latency_ms: float | None = None
    avg_cost_usd: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
