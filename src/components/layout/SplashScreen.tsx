"use client";

import React, { useEffect, useState } from "react";

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [progress, setProgress] = useState(15);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(45), 150);
    const timer2 = setTimeout(() => setProgress(85), 350);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        onFinish?.();
      }, 250);
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A2E5A] text-white transition-opacity duration-300">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg border border-white/20">
          <svg className="w-10 h-10 text-[#F5741A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10"/>
            <path d="M6 10h10"/>
            <path d="M12 18v-4"/>
            <path d="m9 15 3-3 3 3"/>
          </svg>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Milestone ERP</h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">Enterprise recruitment & interview management</p>
        </div>

        <div className="w-48 h-1.5 bg-white/20 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-[#F5741A] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
