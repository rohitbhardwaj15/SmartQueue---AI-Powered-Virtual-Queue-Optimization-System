"use client";

import { QueueEntry } from "@/lib/types";

export function QueueList({ items }: { items: QueueEntry[] }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Live Queue Board</h3>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
          {items.length} waiting
        </span>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
            Queue is empty.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item._id}
              className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-cyan-400/60"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  #{index + 1} {item.tokenNumber}
                </p>
                <span className="text-xs text-slate-400">{item.predictedWaitMinutes} mins</span>
              </div>
              <p className="text-sm text-slate-300">{item.userName}</p>
              <p className="text-xs text-slate-400">
                {item.sector.toUpperCase()} | {item.branchName}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
