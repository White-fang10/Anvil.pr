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
