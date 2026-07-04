/**
 * lib/api.ts — Typed fetch wrappers for the Anvil.pr FastAPI backend.
 * Base URL points to the local dev server. Update for production.
 */

const BASE = "http://localhost:8000";

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

