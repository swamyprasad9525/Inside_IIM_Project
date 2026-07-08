"use client";

import { useState } from "react";
import type { ResearchReport } from "@/lib/types";

interface FollowUpChatProps {
  report: ResearchReport;
}

interface QA {
  question: string;
  answer: string;
}

export function FollowUpChat({ report }: FollowUpChatProps) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QA[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;

    setIsAsking(true);
    setError(null);

    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to get an answer");

      setHistory((prev) => [...prev, { question: q, answer: data.answer }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-xl border border-black/10 p-6 dark:border-white/15">
      <h3 className="mb-3 text-sm font-semibold">Ask a follow-up question</h3>

      {history.length > 0 && (
        <div className="mb-4 space-y-3">
          {history.map((qa, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium">Q: {qa.question}</p>
              <p className="mt-1 text-black/70 dark:text-white/70">{qa.answer}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isAsking}
          placeholder="e.g. What's driving the risk score?"
          className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30 disabled:opacity-50 dark:border-white/15 dark:bg-black/20"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
        >
          {isAsking ? "…" : "Ask"}
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
