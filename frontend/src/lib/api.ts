/**
 * lib/api.ts — Typed fetch wrappers for the Anvil.pr FastAPI backend.
 * Base URL points to NEXT_PUBLIC_API_URL environment variable or falls back to Render.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Project {
  id: number;
  name: string;
  created_at: string;
}

export interface Prompt {
  id: number;
  project_id: number;
  name: string;
  created_at: string;
}

export interface PromptVersion {
  id: number;
  prompt_id: number;
  version_number: number;
  content: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const getProjects = () => apiFetch<Project[]>("/projects");

export const getProject = (id: number) =>
  apiFetch<Project>(`/projects/${id}`);

export const createProject = (name: string) =>
  apiFetch<Project>("/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export const getPrompts = (projectId: number) =>
  apiFetch<Prompt[]>(`/projects/${projectId}/prompts`);

export const getPrompt = (promptId: number) =>
  apiFetch<Prompt>(`/prompts/${promptId}`);

export const createPrompt = (projectId: number, name: string) =>
  apiFetch<Prompt>(`/projects/${projectId}/prompts`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const updatePrompt = (promptId: number, name: string) =>
  apiFetch<Prompt>(`/prompts/${promptId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

export const getVersions = (promptId: number) =>
  apiFetch<PromptVersion[]>(`/prompts/${promptId}/versions`);

export const createVersion = (promptId: number, content: string) =>
  apiFetch<PromptVersion>(`/prompts/${promptId}/versions`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

export interface DatasetMeta {
  id: number;
  project_id: number;
  name: string;
  row_count: number;
  created_at: string;
}

export interface DatasetDetail {
  id: number;
  project_id: number;
  name: string;
  rows: Array<{ input: string; expected_output: string }>;
  created_at: string;
}

export const getDatasets = (projectId: number) =>
  apiFetch<DatasetMeta[]>(`/projects/${projectId}/datasets`);

export const getDatasetDetail = (datasetId: number) =>
  apiFetch<DatasetDetail>(`/datasets/${datasetId}`);

/** Upload a CSV file using multipart/form-data */
export async function uploadDataset(
  projectId: number,
  file: File
): Promise<DatasetMeta> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/projects/${projectId}/datasets`, {
    method: "POST",
    body: form,
    // Do NOT set Content-Type — browser sets it with the correct boundary
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(data.detail ?? `Upload failed (${res.status})`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Evaluations
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  input: string;
  expected_output: string;
  model: string;
  output: string;
  latency_ms: number;
  cost_usd: number;
  error?: string | null;
  semantic_score?: number | null;
  judge_score?: number | null;
  judge_reasoning?: string | null;
  instruction_following_score?: number | null;
  instruction_following_results?: Record<string, boolean> | null;
}

export interface EvaluationRun {
  id: number;
  version_id: number;
  dataset_id: number;
  model: string;
  results_json: EvaluationResult[];
  avg_accuracy: number | null;
  avg_latency_ms: number | null;
  avg_cost_usd: number | null;
  created_at: string;
}

export const runEvaluation = (versionId: number, datasetId: number, models: string[]) =>
  apiFetch<EvaluationRun[]>("/evaluate", {
    method: "POST",
    body: JSON.stringify({ version_id: versionId, dataset_id: datasetId, models }),
  });

export const getEvaluations = (versionId: number) =>
  apiFetch<EvaluationRun[]>(`/evaluations/${versionId}`);

export interface PromptComparisonRow {
  version_number: number;
  model: string;
  avg_accuracy: number | null;
  avg_latency_ms: number | null;
  avg_cost_usd: number | null;
  created_at: string;
}

export const getPromptComparison = (promptId: number) =>
  apiFetch<PromptComparisonRow[]>(`/prompts/${promptId}/comparison`);
