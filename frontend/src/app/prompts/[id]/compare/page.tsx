"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrompt, getPromptComparison, Prompt, PromptComparisonRow } from "@/lib/api";
import { cn } from "@/lib/utils";

// colors for models in the chart
const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ComparePage() {
  const params = useParams();
  const router = useRouter();
  const promptId = parseInt(params.id as string);

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [data, setData] = useState<PromptComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("All");

  useEffect(() => {
    async function load() {
      try {
        const [p, cmpData] = await Promise.all([
          getPrompt(promptId),
          getPromptComparison(promptId),
        ]);
        setPrompt(p);
        setData(cmpData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (!isNaN(promptId)) {
      load();
    }
  }, [promptId]);

  const models = useMemo(() => {
    const s = new Set<string>();
    data.forEach((r) => s.add(r.model));
    return Array.from(s).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedModel === "All") return data;
    return data.filter((d) => d.model === selectedModel);
  }, [data, selectedModel]);

  const summary = useMemo(() => {
    if (!filteredData.length) return "No evaluation data available to compare.";
    
    // Group by version
    const versionMap = new Map<number, PromptComparisonRow[]>();
    filteredData.forEach((row) => {
      if (!versionMap.has(row.version_number)) versionMap.set(row.version_number, []);
      versionMap.get(row.version_number)!.push(row);
    });

    const versions = Array.from(versionMap.keys()).sort((a, b) => b - a);
    if (versions.length < 2) return "Evaluate more versions to see comparison trends.";

    const latest = versions[0];
    const previous = versions[1];

    const latestRows = versionMap.get(latest)!;
    const previousRows = versionMap.get(previous)!;

    // Calculate averages across models for latest vs previous
    const getAverages = (rows: PromptComparisonRow[]) => {
      let accSum = 0, latSum = 0, accCount = 0, latCount = 0;
      rows.forEach(r => {
        if (r.avg_accuracy !== null && r.avg_accuracy !== undefined) {
          accSum += r.avg_accuracy;
          accCount++;
        }
        if (r.avg_latency_ms !== null && r.avg_latency_ms !== undefined) {
          latSum += r.avg_latency_ms;
          latCount++;
        }
      });
      return {
        acc: accCount > 0 ? accSum / accCount : null,
        lat: latCount > 0 ? latSum / latCount : null,
      };
    };

    const latestAvg = getAverages(latestRows);
    const prevAvg = getAverages(previousRows);

    if (latestAvg.acc === null || prevAvg.acc === null) return "Insufficient accuracy data to compare the latest versions.";

    const accDiff = latestAvg.acc - prevAvg.acc;
    let latDiffStr = "";
    if (latestAvg.lat !== null && prevAvg.lat !== null && prevAvg.lat > 0) {
      const latDiff = latestAvg.lat - prevAvg.lat;
      const latPct = (Math.abs(latDiff) / prevAvg.lat) * 100;
      if (latDiff < 0) {
        latDiffStr = ` and reduced latency by ${latPct.toFixed(1)}%`;
      } else if (latDiff > 0) {
        latDiffStr = ` but increased latency by ${latPct.toFixed(1)}%`;
      }
    }

    const direction = accDiff >= 0 ? "improved" : "decreased";
    const subject = selectedModel === "All" ? `across all models` : `for ${selectedModel}`;

    return `Version ${latest} ${direction} accuracy by ${Math.abs(accDiff).toFixed(1)}% ${subject} compared to Version ${previous}${latDiffStr}.`;

  }, [filteredData, selectedModel]);

  // Chart data formatting
  const chartData = useMemo(() => {
    const versionMap = new Map<number, any>();
    data.forEach((row) => {
      if (!versionMap.has(row.version_number)) {
        versionMap.set(row.version_number, { version: `v${row.version_number}` });
      }
      const entry = versionMap.get(row.version_number);
      if (row.avg_accuracy !== null && row.avg_accuracy !== undefined) {
        entry[row.model] = row.avg_accuracy;
      }
    });
    return Array.from(versionMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(entry => entry[1]);
  }, [data]);

  // Table rendering logic (grouped by version, showing models as rows)
  const sortedTableData = useMemo(() => {
    return [...filteredData].sort((a, b) => b.version_number - a.version_number);
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass rounded-2xl px-8 py-6 text-white/40 text-sm tracking-widest uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!prompt) return <div className="p-8 text-red-400 tracking-wide">Prompt not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-page-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/prompts/${promptId}`)}
          className="h-9 w-9 rounded-full glass flex items-center justify-center text-white/50 hover:text-white/90 transition-all duration-200 hover:glass-elevated"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs tracking-[0.3em] text-white/30 uppercase font-medium mb-1">{prompt.name}</p>
          <h1
            className="text-2xl font-bold tracking-widest text-white/90 uppercase"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            Compare Versions
          </h1>
          <div className="h-px w-12 bg-gradient-to-r from-white/30 to-transparent mt-2" />
        </div>
      </div>

      {/* Model Filter */}
      {models.length > 1 && (
        <div className="glass flex items-center gap-2 p-2 rounded-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/25 ml-3 mr-3">Model</span>
          <Button 
            variant={selectedModel === "All" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setSelectedModel("All")}
            className={cn("rounded-full transition-all text-xs", selectedModel === "All" ? "" : "text-white/50")}
          >
            All Models
          </Button>
          {models.map(m => (
            <Button 
              key={m} 
              variant={selectedModel === m ? "default" : "outline"} 
              size="sm" 
              onClick={() => setSelectedModel(m)}
              className={cn("rounded-full transition-all", selectedModel === m ? "shadow-md" : "hover:bg-background/80")}
            >
              {m.split('/').pop()}
            </Button>
          ))}
        </div>
      )}

      {/* Summary Card */}
      <Card className="border-border shadow-md bg-gradient-to-br from-card to-card/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-1.5 rounded-md">
              <TrendingUp className="h-4 w-4" />
            </span>
            Executive Summary
          </CardTitle>
          <CardDescription className="text-xs font-medium uppercase tracking-wider">Auto-generated Insights</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-medium tracking-tight text-foreground/90 leading-relaxed">
            {summary}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <Card className="col-span-1 shadow-md border-border h-[450px] flex flex-col">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-base font-semibold">Accuracy Trend</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-6 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="version" stroke="currentColor" className="opacity-50 text-xs font-medium" tickLine={false} axisLine={false} dy={10} />
                <YAxis domain={[0, 100]} stroke="currentColor" className="opacity-50 text-xs font-medium" tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                  labelStyle={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', fontWeight: 500 }} />
                {models.map((model, idx) => {
                  if (selectedModel !== "All" && selectedModel !== model) return null;
                  return (
                    <Line 
                      key={model} 
                      name={model.split('/').pop()}
                      type="monotone" 
                      dataKey={model} 
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--card))" }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card className="col-span-1 shadow-md border-border flex flex-col max-h-[450px]">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-base font-semibold">Detailed Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto flex-1 custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 backdrop-blur-xl z-10">
                <TableRow className="hover:bg-transparent border-b-border/40">
                  <TableHead className="w-[80px] font-semibold text-xs uppercase tracking-wider">Ver</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Model</TableHead>
                  <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Accuracy</TableHead>
                  <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Latency</TableHead>
                  <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTableData.map((row) => {
                  // Find previous version for this model to compare
                  const prevRow = sortedTableData.find(r => r.model === row.model && r.version_number === row.version_number - 1);
                  
                  const getDeltaColor = (current: number | null, previous: number | null | undefined, lowerIsBetter = false) => {
                    if (current === null || previous === null || previous === undefined) return "text-foreground";
                    const diff = current - previous;
                    if (Math.abs(diff) < 0.01) return "text-muted-foreground";
                    if (diff > 0) return lowerIsBetter ? "text-red-500 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10";
                    return lowerIsBetter ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10";
                  };

                  const getIcon = (current: number | null, previous: number | null | undefined, lowerIsBetter = false) => {
                    if (current === null || previous === null || previous === undefined) return <Minus className="h-3 w-3 opacity-30" />;
                    const diff = current - previous;
                    if (Math.abs(diff) < 0.01) return <Minus className="h-3 w-3 opacity-30" />;
                    if (diff > 0) return lowerIsBetter ? <TrendingUp className="h-3 w-3 text-red-500" /> : <TrendingUp className="h-3 w-3 text-emerald-500" />;
                    return lowerIsBetter ? <TrendingDown className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />;
                  };

                  const accColor = getDeltaColor(row.avg_accuracy, prevRow?.avg_accuracy);
                  const latColor = getDeltaColor(row.avg_latency_ms, prevRow?.avg_latency_ms, true);
                  const costColor = getDeltaColor(row.avg_cost_usd, prevRow?.avg_cost_usd, true);

                  return (
                    <TableRow key={`${row.version_number}-${row.model}`} className="transition-colors border-b border-border/30 hover:bg-muted/30 group">
                      <TableCell className="font-medium text-center py-4">
                        <div className="bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center mx-auto text-xs font-bold">
                          v{row.version_number}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                        {row.model.split('/').pop()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold tracking-tight transition-colors", accColor)}>
                          {row.avg_accuracy !== null ? `${row.avg_accuracy.toFixed(1)}%` : "N/A"}
                          {getIcon(row.avg_accuracy, prevRow?.avg_accuracy)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold tracking-tight transition-colors", latColor)}>
                          {row.avg_latency_ms !== null ? `${row.avg_latency_ms.toFixed(0)} ms` : "N/A"}
                          {getIcon(row.avg_latency_ms, prevRow?.avg_latency_ms, true)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold tracking-tight transition-colors", costColor)}>
                          {row.avg_cost_usd !== null ? `$${row.avg_cost_usd.toFixed(4)}` : "N/A"}
                          {getIcon(row.avg_cost_usd, prevRow?.avg_cost_usd, true)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sortedTableData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium">
                      No evaluation data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
