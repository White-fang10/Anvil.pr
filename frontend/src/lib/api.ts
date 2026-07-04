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
