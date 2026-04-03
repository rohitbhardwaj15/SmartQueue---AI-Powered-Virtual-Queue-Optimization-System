"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { JoinQueueForm } from "@/components/join-queue-form";
import { QueueList } from "@/components/queue-list";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { api, getApiUrl } from "@/lib/api";
import { QueueEntry } from "@/lib/types";
import { Activity, Building2, Landmark, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [items, setItems] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState<null | {
    predictedWaitMinutes: number;
    message: string;
    suggestion: string;
  }>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [{ data: list }, { data: predict }] = await Promise.all([
        api.get<QueueEntry[]>("/api/queue/list?status=waiting"),
        api.get("/api/queue/predict?sector=hospital&branchName=City Center")
      ]);
      setItems(list);
      setPrediction(predict);
    } catch {
      setError("Unable to load queue data right now. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const socket = io(getApiUrl(), { transports: ["websocket"] });
    socket.on("queue:joined", load);
    socket.on("queue:updated", load);

    return () => {
      socket.disconnect();
    };
  }, [load]);

  const sectors = useMemo(
    () => [
      { title: "Hospitals", icon: Activity, desc: "Emergency, OPD and diagnostics queue flow." },
      { title: "Banks", icon: Building2, desc: "Tokenized service counters and low crowd suggestions." },
      { title: "Gov Offices", icon: Landmark, desc: "License, ID and certificate queue optimization." }
    ],
    []
  );

  return (
    <div className="mx-auto w-[min(1200px,94vw)] space-y-10 pt-10">
      <section className="rounded-3xl border border-slate-700/70 bg-gradient-to-br from-violet-600/60 via-indigo-700/50 to-cyan-700/40 p-8 md:p-12">
        <div className="mb-6 flex justify-end">
          <Link
            href="/dashboard"
            className="rounded-full bg-white/90 px-5 py-2 text-sm font-semibold text-violet-700 transition hover:brightness-95"
          >
            Admin Login
          </Link>
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs text-cyan-100">
          <Sparkles className="h-4 w-4" /> AI-Powered Queue Management
        </p>
        <h1 className="text-4xl font-semibold leading-tight md:text-6xl">No More Long Queues</h1>
        <p className="mt-5 max-w-3xl text-lg text-cyan-50/90 md:text-xl">
          Join virtual queues, get smart token assignment, and receive AI wait-time predictions with best-time suggestions.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {sectors.map((sector) => (
            <article key={sector.title} className="glass rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-glow">
              <sector.icon className="mb-4 h-6 w-6 text-cyan-300" />
              <h3 className="text-lg font-semibold">{sector.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{sector.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <JoinQueueForm onJoined={load} />
        {loading ? <LoadingSkeleton /> : <QueueList items={items} />}
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="section-title">AI Queue Insights</h2>
        {!prediction ? (
          <p className="mt-4 text-slate-400">Loading prediction...</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-400">Predicted Wait</p>
              <p className="text-3xl font-semibold text-cyan-200">{prediction.predictedWaitMinutes}m</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-400">Traffic Signal</p>
              <p className="text-xl font-semibold">{prediction.message}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-400">Best Time Suggestion</p>
              <p className="text-xl font-semibold">{prediction.suggestion}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
