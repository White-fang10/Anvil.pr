"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Database,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getDatasets,
  getDatasetDetail,
  uploadDataset,
  type DatasetMeta,
  type DatasetDetail,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Drag-and-Drop Upload Zone
// ---------------------------------------------------------------------------
interface UploadZoneProps {
  onFile: (file: File) => void;
  uploading: boolean;
}

function UploadZone({ onFile, uploading }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Reset so same file can be re-uploaded
    e.target.value = "";
  };

  return (
    <div
      id="dataset-upload-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && inputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200",
        dragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-border hover:border-primary/50 hover:bg-accent/40",
        uploading && "opacity-60 cursor-not-allowed"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
        disabled={uploading}
      />
      <div className={cn(
        "rounded-full p-3 transition-colors",
        dragging ? "bg-primary/20" : "bg-secondary"
      )}>
        <Upload className={cn(
          "h-6 w-6 transition-colors",
          dragging ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">
          {uploading ? "Uploading…" : "Drop a CSV file here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or <span className="text-primary underline-offset-2 underline">click to browse</span>
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          Requires columns: <code className="font-mono bg-secondary px-1 rounded text-[11px]">input</code>, <code className="font-mono bg-secondary px-1 rounded text-[11px]">expected_output</code>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview Table (first 5 rows)
// ---------------------------------------------------------------------------
interface PreviewProps {
  detail: DatasetDetail;
  onDismiss: () => void;
}

function PreviewTable({ detail, onDismiss }: PreviewProps) {
  const preview = detail.rows.slice(0, 5);
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">
            Uploaded: {detail.name}
          </span>
          <Badge variant="secondary" className="text-xs">
            {detail.rows.length} rows
          </Badge>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss preview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-3">
          Preview — first {preview.length} of {detail.rows.length} rows
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-xs">#</TableHead>
              <TableHead className="text-xs">Input</TableHead>
              <TableHead className="text-xs">Expected Output</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                <TableCell className="text-xs max-w-[240px]">
                  <span className="line-clamp-2">{row.input}</span>
                </TableCell>
                <TableCell className="text-xs max-w-[240px]">
                  <span className="line-clamp-2">{row.expected_output}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dataset row in the existing-datasets list
// ---------------------------------------------------------------------------
interface DatasetRowProps {
  dataset: DatasetMeta;
  selected: boolean;
  onSelect: (id: number) => void;
}

function DatasetRow({ dataset, selected, onSelect }: DatasetRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const toggleExpand = async () => {
    if (!expanded && !detail) {
      setLoadingDetail(true);
      try {
        const d = await getDatasetDetail(dataset.id);
        setDetail(d);
      } catch {
        // ignore
      } finally {
        setLoadingDetail(false);
      }
    }
    setExpanded((p) => !p);
  };

  return (
    <div
      id={`dataset-row-${dataset.id}`}
      className={cn(
        "rounded-lg border transition-all duration-150",
        selected
          ? "border-primary/40 bg-primary/8 shadow-sm shadow-primary/10"
          : "border-border hover:border-border/80"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Select radio */}
        <button
          id={`select-dataset-${dataset.id}`}
          onClick={() => onSelect(dataset.id)}
          className={cn(
            "flex-shrink-0 h-4 w-4 rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary"
              : "border-border hover:border-primary/60"
          )}
          aria-label={`Select dataset ${dataset.name}`}
        >
          {selected && <span className="flex h-full w-full items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
          </span>}
        </button>

        <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{dataset.name}</p>
          <p className="text-xs text-muted-foreground">
            {dataset.row_count} rows · {formatDate(dataset.created_at)}
          </p>
        </div>

        <Badge variant={selected ? "default" : "secondary"} className="text-xs shrink-0">
          {dataset.row_count} rows
        </Badge>

        <button
          onClick={toggleExpand}
          className="text-muted-foreground hover:text-foreground transition-colors ml-1"
          aria-label="Toggle preview"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Inline preview */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          {loadingDetail ? (
            <p className="text-xs text-muted-foreground py-2">Loading preview…</p>
          ) : detail ? (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                First 5 of {detail.rows.length} rows
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">#</TableHead>
                    <TableHead className="text-xs">Input</TableHead>
                    <TableHead className="text-xs">Expected Output</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        <span className="line-clamp-2">{row.input}</span>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        <span className="line-clamp-2">{row.expected_output}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DatasetSection component
// ---------------------------------------------------------------------------
interface DatasetSectionProps {
  projectId: number;
  /** Called when the selected dataset changes (for future eval run use). */
  onDatasetSelected?: (datasetId: number | null) => void;
}

export function DatasetSection({ projectId, onDatasetSelected }: DatasetSectionProps) {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [freshUpload, setFreshUpload] = useState<DatasetDetail | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    getDatasets(projectId)
      .then(setDatasets)
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setFreshUpload(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only .csv files are accepted.");
      return;
    }

    setUploading(true);
    try {
      const meta = await uploadDataset(projectId, file);
      // Fetch the full detail for the preview table
      const detail = await getDatasetDetail(meta.id);
      setDatasets((prev) => [meta, ...prev]);
      setFreshUpload(detail);
      setSelectedId(meta.id);
      onDatasetSelected?.(meta.id);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = (id: number) => {
    const next = selectedId === id ? null : id;
    setSelectedId(next);
    onDatasetSelected?.(next);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Datasets</CardTitle>
          {datasets.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {datasets.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload zone */}
        <UploadZone onFile={handleFile} uploading={uploading} />

        {/* Upload error */}
        {uploadError && (
          <div
            id="upload-error-banner"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3"
          >
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Upload failed</p>
              <p className="text-xs text-destructive/80 mt-0.5">{uploadError}</p>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-destructive/60 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Fresh upload preview */}
        {freshUpload && (
          <PreviewTable detail={freshUpload} onDismiss={() => setFreshUpload(null)} />
        )}

        {/* Existing datasets list */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading datasets…</p>
        ) : datasets.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Uploaded datasets — click to select for evaluation
            </p>
            {datasets.map((d) => (
              <DatasetRow
                key={d.id}
                dataset={d}
                selected={selectedId === d.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-2">
            No datasets yet — upload a CSV above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
