"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";

type FormState = {
  userName: string;
  phone: string;
  branchName: string;
  sector: "hospital" | "bank" | "government";
};

const INITIAL_STATE: FormState = {
  userName: "",
  phone: "",
  branchName: "City Center",
  sector: "hospital"
};

export function JoinQueueForm({ onJoined }: { onJoined: () => void }) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<null | {
    tokenNumber: string;
    predictedWaitMinutes: number;
    waitMessage: string;
    suggestion: string;
  }>(null);

  const qrValue = useMemo(() => {
    if (!receipt) return "";
    return `SmartQueue Token: ${receipt.tokenNumber} | ETA ${receipt.predictedWaitMinutes} min`;
  }, [receipt]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/api/queue/join", form);
      setReceipt({
        tokenNumber: data.entry.tokenNumber,
        predictedWaitMinutes: data.entry.predictedWaitMinutes,
        waitMessage: data.ai.waitMessage,
        suggestion: data.ai.suggestion
      });
      setForm(INITIAL_STATE);
      onJoined();
    } catch (err: any) {
      const message = err?.response?.data?.error || "Unable to join queue right now. Please retry.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="mb-4 text-xl font-semibold">Join Virtual Queue</h3>
      <form className="grid gap-3" onSubmit={submit}>
        <input
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3"
          placeholder="Your full name"
          value={form.userName}
          onChange={(e) => setForm((prev) => ({ ...prev, userName: e.target.value }))}
          required
        />
        <input
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3"
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
        />
        <select
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3"
          value={form.sector}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, sector: e.target.value as FormState["sector"] }))
          }
        >
          <option value="hospital">Hospital</option>
          <option value="bank">Bank</option>
          <option value="government">Government Office</option>
        </select>
        <input
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3"
          placeholder="Branch / Office"
          value={form.branchName}
          onChange={(e) => setForm((prev) => ({ ...prev, branchName: e.target.value }))}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Joining..." : "Get Token"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {receipt && (
        <div className="mt-5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4">
          <p className="font-semibold">Token: {receipt.tokenNumber}</p>
          <p>Predicted wait: {receipt.predictedWaitMinutes} mins</p>
          <p>{receipt.waitMessage}</p>
          <p>{receipt.suggestion}</p>
          <div className="mt-3 inline-block rounded-lg bg-white p-2">
            <QRCodeSVG value={qrValue} size={88} />
          </div>
        </div>
      )}
    </div>
  );
}
