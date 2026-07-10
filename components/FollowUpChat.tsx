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
    <div className="clay w-full max-w-2xl p-7">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--clay-purple-dark)]">
        Ask a follow-up question
      </h3>

      {history.length > 0 && (
        <div className="mb-4 space-y-3">
          {history.map((qa, i) => (
            <div key={i} className="clay-inset p-3 text-sm">
              <p className="font-semibold">Q: {qa.question}</p>
              <p className="mt-1 text-[var(--foreground)]/70">{qa.answer}</p>
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
          className="clay-inset flex-1 border-none px-4 py-2.5 text-sm outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          className="clay-btn bg-gradient-to-br from-[var(--clay-purple)] to-[var(--clay-purple-dark)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {isAsking ? "…" : "Ask"}
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-[var(--clay-peach-dark)]">{error}</p>}
    </div>
  );
}
