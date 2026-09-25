"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, X, Sparkles } from "lucide-react";

export function VersionReloadBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{ version?: string; notes?: string }>({});

  useEffect(() => {
    // 1. Service Worker Update Listener
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setHasUpdate(true);
              }
            });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 2. Periodic app-version check from Supabase releases
    async function checkVersion() {
      try {
        const res = await fetch("/api/app-version");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.version) {
          const currentVersion = localStorage.getItem("milestone_app_version");
          if (currentVersion && currentVersion !== data.version) {
            setVersionInfo({ version: data.version, notes: data.notes });
            setHasUpdate(true);
          } else if (!currentVersion) {
            localStorage.setItem("milestone_app_version", data.version);
          }
        }
      } catch (err) {
        // Silent catch
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReload = () => {
    if (versionInfo.version) {
      localStorage.setItem("milestone_app_version", versionInfo.version);
    }
    window.location.reload();
  };

  if (!hasUpdate) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in slide-in-from-top-4 duration-200">
      <div className="bg-[#0A2E5A] text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#F5741A] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight">New version available</p>
            <p className="text-[11px] text-blue-200 truncate">
              {versionInfo.notes || "An update is ready for Milestone ERP."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5741A] hover:bg-[#d96210] text-white text-xs font-bold transition-transform active:scale-95 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Reload</span>
          </button>
          <button
            onClick={() => setHasUpdate(false)}
            className="w-7 h-7 rounded-lg text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
