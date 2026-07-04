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
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/projects" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Projects
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground mt-1">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button id="new-prompt-btn" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Prompt
        </Button>
      </div>

      {/* Prompts list */}
      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 border border-dashed border-border rounded-xl text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">No prompts yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Click &quot;New Prompt&quot; to add your first prompt.
            </p>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Prompts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id} className="group">
                    <TableCell className="font-medium">
                      <InlineEdit
                        value={prompt.name}
                        promptId={prompt.id}
                        onSaved={handlePromptRenamed}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
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
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Open
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New Prompt Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label htmlFor="prompt-name-input" className="text-sm font-medium mb-2 block text-muted-foreground">
              Prompt name
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
    </div>
  );
}
