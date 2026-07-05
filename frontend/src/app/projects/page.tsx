"use client";

import { useEffect, useState } from "react";
import { Plus, FolderOpen, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getProjects, createProject, type Project } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.3em] text-white/30 uppercase font-medium mb-2">
            Workspace
          </p>
          <h1
            className="text-4xl font-bold tracking-widest text-white/90 uppercase"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            Projects
          </h1>
          <div className="h-px w-16 bg-gradient-to-r from-white/30 to-transparent mt-3" />
        </div>
        <Button
          id="new-project-btn"
          onClick={() => setDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="glass rounded-2xl h-28 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="glass rounded-2xl flex items-center justify-center h-48 text-red-400 text-sm tracking-wide">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl flex flex-col items-center justify-center h-64 gap-5 text-center">
          <div className="glass-elevated p-5 rounded-2xl">
            <FolderOpen className="h-10 w-10 text-white/25" />
          </div>
          <div>
            <p className="font-semibold text-white/60 tracking-widest text-sm uppercase">
              No Projects Yet
            </p>
            <p className="text-xs text-white/25 mt-1.5 tracking-wide">
              Click &quot;New Project&quot; to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, idx) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div
                className="glass rounded-2xl p-6 cursor-pointer group relative overflow-hidden transition-all duration-300 hover:glass-elevated"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Inner shine highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl bg-gradient-to-br from-white/04 to-transparent pointer-events-none" />

                <div className="flex items-start justify-between mb-5">
                  <div className="glass p-2.5 rounded-xl">
                    <FolderOpen className="h-4 w-4 text-white/50 group-hover:text-white/80 transition-colors" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                </div>

                <h3 className="font-semibold text-white/85 group-hover:text-white transition-colors tracking-wide mb-2 leading-snug">
                  {project.name}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-white/25 tracking-wide">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(project.created_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <label
              htmlFor="project-name-input"
              className="text-xs font-medium mb-2.5 block text-white/40 tracking-widest uppercase"
            >
              Project Name
            </label>
            <Input
              id="project-name-input"
              placeholder="e.g. Medical Chatbot, Support Agent..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              id="create-project-submit"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? "Creating…" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
