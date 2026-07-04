"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Clock, GitBranch } from "lucide-react";
import { getVersions, createVersion, getPrompts, getProject, type PromptVersion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function absoluteTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PromptEditorPage() {
  const params = useParams<{ id: string }>();
  const promptId = Number(params.id);

  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selected, setSelected] = useState<PromptVersion | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptName, setPromptName] = useState<string>("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [savedFlash, setSavedFlash] = useState(false);

  const loadVersions = useCallback(async () => {
    try {
      const data = await getVersions(promptId);
      setVersions(data);
      if (data.length > 0 && !selected) {
        setSelected(data[0]);
        setContent(data[0].content);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load versions");
    }
  }, [promptId, selected]);

  // Load prompt metadata (name + project info) for breadcrumbs
  useEffect(() => {
    const init = async () => {
      try {
        const data = await getVersions(promptId);
        setVersions(data);
        if (data.length > 0) {
          setSelected(data[0]);
          setContent(data[0].content);
        }

        // Get prompt info from its project — we need the prompt to find the project
        // Use the prompt_id from version data (or fetch a known project list)
        // Since we don't have GET /prompts/{id} endpoint, we'll try to find via project list
        // We'll extract project_id from versions if available, else skip breadcrumb enhancement
        if (data.length > 0) {
          // We can't easily get the prompt name without an endpoint, so we'll show "Prompt #id"
          // and try to find the project via the prompt's project relationship
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [promptId]);

  // Try to resolve breadcrumb from prompts list for context
  useEffect(() => {
    // We'll try fetching the prompt via a search of all possible approaches
    // Since we only have GET /projects/{id}/prompts, we store a hint in localStorage if navigating from project
    const hint = localStorage.getItem(`prompt_${promptId}_meta`);
    if (hint) {
      try {
        const { name, pid, pname } = JSON.parse(hint);
        setPromptName(name);
        setProjectId(pid);
        setProjectName(pname);
      } catch {
        // ignore
      }
    }
  }, [promptId]);

  const selectVersion = (v: PromptVersion) => {
    setSelected(v);
    setContent(v.content);
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const created = await createVersion(promptId, content.trim());
      setVersions((prev) => [created, ...prev]);
      setSelected(created);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save version");
    } finally {
      setSaving(false);
    }
  };

  const isLatest = selected && versions.length > 0 && selected.id === versions[0].id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/projects" className="hover:text-foreground transition-colors">
          Projects
        </Link>
        {projectId && (
          <>
            <span>/</span>
            <Link href={`/projects/${projectId}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
              {projectName || `Project`}
            </Link>
          </>
        )}
        {!projectId && (
          <Link href="/projects" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        )}
        <span>/</span>
        <span className="text-foreground font-medium">
          {promptName || `Prompt #${promptId}`}
        </span>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left: Version history panel */}
        <aside className="w-72 shrink-0 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Version History</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {versions.length}
            </Badge>
          </div>

          {versions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm text-muted-foreground">No versions yet.</p>
              <p className="text-xs text-muted-foreground/60">
                Write your prompt and click &quot;Save as new version&quot;.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {versions.map((v) => (
                <button
                  key={v.id}
                  id={`version-${v.version_number}`}
                  onClick={() => selectVersion(v)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all duration-150 group",
                    selected?.id === v.id
                      ? "bg-primary/15 border border-primary/30 shadow-sm"
                      : "hover:bg-accent border border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-sm font-semibold",
                      selected?.id === v.id ? "text-primary" : "text-foreground"
                    )}>
                      v{v.version_number}
                    </span>
                    {v.id === versions[0].id && (
                      <Badge variant="default" className="text-[10px] h-4 px-1.5">
                        latest
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span title={absoluteTime(v.created_at)}>{relativeTime(v.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-1 truncate">
                    {v.content.slice(0, 60)}{v.content.length > 60 ? "…" : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Right: Editor */}
        <div className="flex-1 flex flex-col min-w-0 border border-border rounded-xl bg-card overflow-hidden">
          {/* Editor header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selected ? `v${selected.version_number}` : "New prompt"}
              </span>
              {selected && !isLatest && (
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30 bg-amber-400/10">
                  Older version — editing creates a new one
                </Badge>
              )}
              {selected && isLatest && (
                <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
                  Latest
                </Badge>
              )}
            </div>
            <Button
              id="save-version-btn"
              size="sm"
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className={cn(
                "transition-all",
                savedFlash && "bg-emerald-600 hover:bg-emerald-600"
              )}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : savedFlash ? "Saved!" : "Save as new version"}
            </Button>
          </div>

          {/* Textarea */}
          <Textarea
            id="prompt-content-editor"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your prompt here…&#10;&#10;You can select an older version from the left panel to review it, then edit and save to create a new version."
            className="flex-1 resize-none rounded-none border-0 focus-visible:ring-0 font-mono text-sm leading-relaxed bg-transparent p-4 min-h-0"
          />

          {/* Footer status */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border shrink-0 text-xs text-muted-foreground">
            <span>{content.length} chars · {content.split(/\s+/).filter(Boolean).length} words</span>
            {selected && (
              <span>Saved {absoluteTime(selected.created_at)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
