"use client";

import { useEffect, useState } from "react";
import { Plus, FolderOpen, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getProjects, createProject, type Project } from "@/lib/api";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createProject(newName.trim());
      setProjects((prev) => [created, ...prev]);
      setNewName("");
      setDialogOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Organise your prompts into projects.
          </p>
        </div>
        <Button id="new-project-btn" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48 text-destructive">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 border border-dashed border-border rounded-xl text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">No projects yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Click &quot;New Project&quot; to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="group cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label htmlFor="project-name-input" className="text-sm font-medium mb-2 block text-muted-foreground">
              Project name
            </label>
            <Input
              id="project-name-input"
              placeholder="e.g. Customer Support Bot"
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
            <Button id="create-project-submit" onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "Creating…" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
