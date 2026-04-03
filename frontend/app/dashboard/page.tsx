"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { api } from "@/lib/api";
import { Overview, TrendResponse } from "@/lib/types";

export default function DashboardPage() {
  const [adminKey, setAdminKey] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const headers = adminKey ? { "x-admin-key": adminKey } : {};
      const [overviewRes, trendsRes] = await Promise.all([
        api.get<Overview>("/api/analytics/overview", { headers }),
        api.get<TrendResponse>("/api/analytics/trends", { headers })
      ]);

      setOverview(overviewRes.data);
      setTrends(trendsRes.data);
    } catch {
      setOverview(null);
      setTrends(null);
      setError("Unauthorized or backend unavailable. Please enter valid admin key.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-[min(1200px,94vw)] space-y-8 pt-10">
      <section className="glass rounded-2xl p-6">
        <h1 className="section-title">Admin Dashboard</h1>
        <p className="mt-2 text-slate-400">Protected analytics zone for operators.</p>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter ADMIN_API_KEY"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 md:max-w-md"
          />
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Analytics"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

        {overview && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Metric title="Total in Queue" value={overview.totalInQueue} />
            <Metric title="Waiting" value={overview.waiting} />
            <Metric title="Serving" value={overview.serving} />
            <Metric title="Avg Wait Time" value={`${overview.avgWaitingTime}m`} />
          </div>
        )}
      </section>

      {trends && (
        <section className="grid gap-6 md:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xl font-semibold">Queue Growth (14-day)</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-4 text-xl font-semibold">Daily/Weekly Trends</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.weeklyBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 md:col-span-2">
            <h2 className="mb-4 text-xl font-semibold">Peak Hours Heatmap (Hour-wise)</h2>
            <div className="grid grid-cols-4 gap-2 md:grid-cols-8 lg:grid-cols-12">
              {trends.hourlyHeatmap.map((slot) => {
                const intensity = Math.min(slot.count / 30, 1);
                const bg = `rgba(34, 211, 238, ${0.12 + intensity * 0.75})`;
                return (
                  <div
                    key={slot.hour}
                    className="rounded-lg border border-slate-700 p-3 text-center"
                    style={{ background: bg }}
                  >
                    <p className="text-xs text-slate-300">{slot.hour}:00</p>
                    <p className="text-lg font-semibold">{slot.count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-3xl font-semibold text-cyan-200">{value}</p>
    </div>
  );
}
