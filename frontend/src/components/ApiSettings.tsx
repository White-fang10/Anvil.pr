"use client";

import React, { useState, useEffect } from "react";
import { Settings, RefreshCw } from "lucide-react";
import { getBaseUrl, setBaseUrl } from "@/lib/api";

export default function ApiSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const currentUrl = getBaseUrl();
    setUrl(currentUrl);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500/60 animate-pulse animate-duration-1000" />
        <span className="text-xs text-white/30 tracking-widest uppercase font-medium">Live</span>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBaseUrl(url.trim());
    setIsOpen(false);
    window.location.reload();
  };

  const handleReset = () => {
    localStorage.removeItem("ANVIL_API_URL");
    const fallback = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    setUrl(fallback);
    setBaseUrl("");
    setIsOpen(false);
    window.location.reload();
  };

  const isOverridden = typeof window !== "undefined" && !!localStorage.getItem("ANVIL_API_URL");

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 text-xs font-medium uppercase tracking-wide cursor-pointer ${
          isOverridden
            ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
        }`}
      >
        <span className={`h-2 w-2 rounded-full animate-pulse ${isOverridden ? "bg-amber-400" : "bg-emerald-400"}`} />
        <span>API: {url.replace(/^https?:\/\//, "")}</span>
        <Settings className="w-3.5 h-3.5 opacity-60 hover:opacity-100 transition-opacity" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-black/90 p-4 shadow-xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <h4 className="text-xs font-semibold text-white/80 uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>Backend API Settings</span>
              {isOverridden && (
                <span className="text-[10px] text-amber-400 normal-case bg-amber-400/10 px-2 py-0.5 rounded-full">
                  Overridden
                </span>
              )}
            </h4>
            
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">
                  API Base URL (e.g. your ngrok URL)
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-white/20 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                {isOverridden && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mr-auto text-[10px] text-white/40 hover:text-white/80 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 text-xs text-white/60 hover:text-white bg-transparent hover:bg-white/5 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs text-black bg-emerald-400 hover:bg-emerald-300 font-medium rounded-md transition-colors cursor-pointer"
                >
                  Save URL
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
