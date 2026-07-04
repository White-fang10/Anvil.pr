"""
models.py — SQLAlchemy ORM models for Anvil.pr.

Tables (exactly 5, as specified):
  - projects
  - prompts
  - prompt_versions
  - datasets
  - evaluation_runs
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON
)
from sqlalchemy.orm import relationship
from database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    prompts = relationship("Prompt", back_populates="project", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="prompts")
    versions = relationship("PromptVersion", back_populates="prompt", cascade="all, delete-orphan")


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    prompt = relationship("Prompt", back_populates="versions")
    evaluation_runs = relationship("EvaluationRun", back_populates="version", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    rows_json = Column(JSON, nullable=False, default=list)  # list of dicts
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="datasets")
    evaluation_runs = relationship("EvaluationRun", back_populates="dataset", cascade="all, delete-orphan")


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    version_id = Column(Integer, ForeignKey("prompt_versions.id", ondelete="CASCADE"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    model = Column(String(128), nullable=False)             # e.g. "gpt-4o", "groq/llama3-70b"
    results_json = Column(JSON, nullable=False, default=list)
    avg_accuracy = Column(Float, nullable=True)
    avg_latency_ms = Column(Float, nullable=True)
    avg_cost_usd = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Relationships
    version = relationship("PromptVersion", back_populates="evaluation_runs")
    dataset = relationship("Dataset", back_populates="evaluation_runs")
