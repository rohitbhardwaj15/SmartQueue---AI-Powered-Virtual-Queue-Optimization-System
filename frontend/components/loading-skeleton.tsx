"use client";

export function LoadingSkeleton() {
  return (
    <div className="glass animate-pulse rounded-2xl p-6">
      <div className="mb-4 h-6 w-44 rounded bg-slate-700" />
      <div className="space-y-2">
        <div className="h-12 rounded bg-slate-800" />
        <div className="h-12 rounded bg-slate-800" />
        <div className="h-12 rounded bg-slate-800" />
      </div>
    </div>
  );
}
