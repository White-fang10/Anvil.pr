"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Clock, GitBranch, Play, Loader2, AlertCircle } from "lucide-react";
import { 
  getVersions, createVersion, getPrompt, getProject, getDatasets,
  runEvaluation, getEvaluations, 
  type PromptVersion, type DatasetMeta, type EvaluationRun 
} from "@/lib/api";
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

const AVAILABLE_MODELS = ["gpt-4o-mini", "groq/llama-3.1-8b-instant"];

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

  // Evaluation states
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | "">("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRun[]>([]);
  const [runningEval, setRunningEval] = useState(false);

  // Load prompt metadata
  useEffect(() => {
    const init = async () => {
      try {
        const prompt = await getPrompt(promptId);
        setPromptName(prompt.name);
        setProjectId(prompt.project_id);
        
        const project = await getProject(prompt.project_id);
        setProjectName(project.name);

        const projectDatasets = await getDatasets(prompt.project_id);
        setDatasets(projectDatasets);
        if (projectDatasets.length > 0) setSelectedDatasetId(projectDatasets[0].id);

        const data = await getVersions(promptId);
        setVersions(data);
        if (data.length > 0) {
          setSelected(data[0]);
          setContent(data[0].content);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [promptId]);

  // Load evaluations when selected version changes
  useEffect(() => {
    if (selected) {
      getEvaluations(selected.id)
        .then(setEvaluations)
        .catch(console.error);
    }
  }, [selected]);

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

  const toggleModel = (model: string) => {
    setSelectedModels(prev => 
      prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
    );
  };

  const handleRunEvaluation = async () => {
    if (!selected || !selectedDatasetId || selectedModels.length === 0) return;
    setRunningEval(true);
    try {
      await runEvaluation(selected.id, Number(selectedDatasetId), selectedModels);
      const evals = await getEvaluations(selected.id);
      setEvaluations(evals);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to run evaluation");
    } finally {
      setRunningEval(false);
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
    <div className="flex flex-col h-full gap-6 pb-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
        <span>/</span>
        <span className="text-foreground font-medium">
          {promptName || `Prompt #${promptId}`}
        </span>
      </div>

      {/* Editor area - Using a fixed height here so it scrolls independently */}
      <div className="flex gap-4 h-[600px] shrink-0">
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

      {/* Evaluate Panel */}
      {selected && (
        <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden mt-6">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" /> Evaluate Version {selected.version_number}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Run this prompt version across a dataset to evaluate its performance.
            </p>
          </div>
          
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dataset Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">1. Select Dataset</label>
                {datasets.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-md bg-muted/10">
                    No datasets available. Please upload one in the project dashboard.
                  </div>
                ) : (
                  <select 
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={selectedDatasetId}
                    onChange={(e) => setSelectedDatasetId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="" disabled>Select a dataset...</option>
                    {datasets.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.row_count} rows)</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">2. Select Models</label>
                <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/10">
                  {AVAILABLE_MODELS.map(model => (
                    <label key={model} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 p-1.5 rounded transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                        checked={selectedModels.includes(model)}
                        onChange={() => toggleModel(model)}
                      />
                      {model}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleRunEvaluation}
              disabled={runningEval || !selectedDatasetId || selectedModels.length === 0}
              className="w-full md:w-auto"
            >
              {runningEval ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running Evaluation...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" /> Run Evaluation
                </>
              )}
            </Button>
          </div>

          {/* Results Area */}
          {evaluations.length > 0 ? (
            <div className="border-t border-border">
              <div className="px-4 py-3 bg-muted/30 border-b border-border flex justify-between items-center">
                <h4 className="font-medium text-sm">Evaluation Results ({evaluations.length} runs)</h4>
                {evaluations[0]?.avg_accuracy !== null && evaluations[0]?.avg_accuracy !== undefined && (
                  <div className="text-sm font-medium">
                    Latest Run Avg Accuracy: <span className="text-emerald-500">{evaluations[0].avg_accuracy.toFixed(1)}%</span>
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">Model</th>
                      <th className="px-4 py-3 font-medium">Input</th>
                      <th className="px-4 py-3 font-medium">Output</th>
                      <th className="px-4 py-3 font-medium">Metrics</th>
                      <th className="px-4 py-3 font-medium">Latency</th>
                      <th className="px-4 py-3 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {evaluations.map((run) => (
                      run.results_json.map((result, idx) => (
                        <tr key={`${run.id}-${idx}`} className={cn("hover:bg-muted/10 transition-colors", result.error ? "bg-red-500/10 hover:bg-red-500/20" : "")}>
                          <td className="px-4 py-3 font-medium whitespace-nowrap align-top">
                            {result.model}
                            {result.error && (
                              <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Error
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top min-w-[200px] max-w-[300px]">
                            <div className="line-clamp-3 text-muted-foreground" title={result.input}>
                              {result.input}
                            </div>
                            <div className="mt-2 text-xs border-t pt-1 border-border/50">
                              <span className="font-semibold">Expected:</span>
                              <div className="line-clamp-2 mt-0.5" title={result.expected_output}>{result.expected_output}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top min-w-[300px] max-w-[500px]">
                            {result.error ? (
                              <div className="text-red-500 text-xs break-words">{result.error}</div>
                            ) : (
                              <div className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto custom-scrollbar text-sm">
                                {result.output}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top min-w-[200px]">
                            <div className="flex flex-col gap-2">
                              {result.semantic_score !== undefined && result.semantic_score !== null && (
                                <div className="text-xs flex items-center justify-between">
                                  <span className="text-muted-foreground">Semantic:</span>
                                  <Badge variant="outline" className={cn(result.semantic_score > 80 ? "text-emerald-500 border-emerald-500/30" : "text-amber-500 border-amber-500/30")}>
                                    {result.semantic_score.toFixed(1)}%
                                  </Badge>
                                </div>
                              )}
                              {result.judge_score !== undefined && result.judge_score !== null && (
                                <div className="text-xs flex items-center justify-between" title={result.judge_reasoning || ""}>
                                  <span className="text-muted-foreground cursor-help underline decoration-dotted">Judge:</span>
                                  <Badge variant="outline" className={cn(result.judge_score >= 8 ? "text-emerald-500 border-emerald-500/30" : result.judge_score >= 5 ? "text-amber-500 border-amber-500/30" : "text-red-500 border-red-500/30")}>
                                    {result.judge_score}/10
                                  </Badge>
                                </div>
                              )}
                              {result.instruction_following_score !== undefined && result.instruction_following_score !== null && (
                                <div className="text-xs flex items-center justify-between">
                                  <span className="text-muted-foreground">Rules:</span>
                                  <Badge variant="outline" className={cn(result.instruction_following_score === 100 ? "text-emerald-500 border-emerald-500/30" : result.instruction_following_score > 0 ? "text-amber-500 border-amber-500/30" : "text-red-500 border-red-500/30")}>
                                    {result.instruction_following_score.toFixed(0)}%
                                  </Badge>
                                </div>
                              )}
                              {result.instruction_following_score === null && result.semantic_score === null && result.judge_score === null && (
                                <span className="text-xs text-muted-foreground italic">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                            {result.latency_ms.toFixed(0)} ms
                          </td>
                          <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                            ${result.cost_usd.toFixed(6)}
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 border-t border-border text-center">
              <div className="bg-muted/30 p-4 rounded-full mb-4">
                <Play className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No evaluations yet</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Select a dataset and one or more models from the configuration panel above, then click Evaluate to see results here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
