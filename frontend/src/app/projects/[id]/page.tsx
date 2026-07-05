"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronLeft, FileText, Pencil, Check, X } from "lucide-react";
import {
  getProject,
  getPrompts,
  createPrompt,
  updatePrompt,
  type Project,
  type Prompt,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatasetSection } from "@/components/DatasetSection";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function InlineEdit({
  value,
  promptId,
  onSaved,
}: {
  value: string;
  promptId: number;
  onSaved: (updated: Prompt) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.trim() || draft === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePrompt(promptId, draft.trim());
      onSaved(updated);
      setEditing(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to rename prompt");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="h-7 text-sm py-0"
          autoFocus
        />
        <button
          onClick={save}
          disabled={saving}
          className="text-primary hover:text-primary/80 transition-colors"
          aria-label="Save name"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={cancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel edit"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group/name">
      <span>{value}</span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover/name:opacity-100 text-muted-foreground hover:text-foreground transition-all"
        aria-label="Edit name"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [proj, proms] = await Promise.all([
          getProject(projectId),
          getPrompts(projectId),
        ]);
        setProject(proj);
        setPrompts(proms);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createPrompt(projectId, newName.trim());
      setPrompts((prev) => [created, ...prev]);
      setNewName("");
      setDialogOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create prompt");
    } finally {
      setCreating(false);
    }
  };

  const handlePromptRenamed = (updated: Prompt) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-48 text-destructive">
        {error ?? "Project not found"}
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-white/30 tracking-widest uppercase font-medium mb-6">
        <Link href="/projects" className="hover:text-white/60 transition-colors">
          Projects
        </Link>
        <span className="text-white/15">/</span>
        <span className="text-white/60">{project.name}</span>
      </div>

      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] text-white/30 uppercase font-medium mb-2">Prompt Library</p>
          <h1
            className="text-3xl font-bold tracking-widest text-white/90 uppercase"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            {project.name}
          </h1>
          <div className="h-px w-16 bg-gradient-to-r from-white/30 to-transparent mt-3" />
          <p className="text-xs text-white/30 mt-2 tracking-wide">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button id="new-prompt-btn" onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Prompt
        </Button>
      </div>

      {/* Prompts list */}
      {prompts.length === 0 ? (
        <div className="glass rounded-2xl flex flex-col items-center justify-center h-64 gap-5 text-center">
          <div className="glass-elevated p-5 rounded-2xl">
            <FileText className="h-10 w-10 text-white/25" />
          </div>
          <div>
            <p className="font-semibold text-white/60 tracking-widest text-sm uppercase">No Prompts Yet</p>
            <p className="text-xs text-white/25 mt-1.5 tracking-wide">
              Click &quot;New Prompt&quot; to add your first prompt.
            </p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/06">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Prompts</p>
          </div>
          <div className="px-2 py-2">
            <Table>
              <TableHeader>
                <TableRow className="border-white/06 hover:bg-transparent">
                  <TableHead className="text-white/30 text-xs uppercase tracking-widest font-medium">Name</TableHead>
                  <TableHead className="text-white/30 text-xs uppercase tracking-widest font-medium">Created</TableHead>
                  <TableHead className="w-24 text-right text-white/30 text-xs uppercase tracking-widest font-medium">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id} className="group border-white/05 hover:bg-white/03">
                    <TableCell className="font-medium text-white/75">
                      <InlineEdit
                        value={prompt.name}
                        promptId={prompt.id}
                        onSaved={handlePromptRenamed}
                      />
                    </TableCell>
                    <TableCell className="text-white/30 text-sm tracking-wide">
                      {formatDate(prompt.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/prompts/${prompt.id}`}
                        onClick={() => {
                          localStorage.setItem(
                            `prompt_${prompt.id}_meta`,
                            JSON.stringify({ name: prompt.name, pid: projectId, pname: project.name })
                          );
                        }}
                      >
                        <Button
                          id={`open-prompt-${prompt.id}`}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60"
                        >
                          Open
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* New Prompt Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Prompt</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <label htmlFor="prompt-name-input" className="text-xs font-medium mb-2.5 block text-white/40 tracking-widest uppercase">
              Prompt Name
            </label>
            <Input
              id="prompt-name-input"
              placeholder="e.g. System Prompt, Summariser, Classifier"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button id="create-prompt-submit" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "Creating…" : "Create Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Datasets section ---- */}
      <div className="mt-8">
        <DatasetSection
          projectId={projectId}
          onDatasetSelected={(id) => {
            // stored for Phase 3 evaluation run wiring
            if (typeof window !== "undefined") {
              if (id) {
                localStorage.setItem(`project_${projectId}_dataset`, String(id));
              } else {
                localStorage.removeItem(`project_${projectId}_dataset`);
              }
            }
          }}
        />
      </div>
    </div>
  );
}
