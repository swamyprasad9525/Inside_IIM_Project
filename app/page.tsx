"use client";

import { useRef, useState } from "react";
import { CompanyForm } from "@/components/CompanyForm";
import { AgentProgress } from "@/components/AgentProgress";
import { DecisionCard } from "@/components/DecisionCard";
import { RubricBreakdown } from "@/components/RubricBreakdown";
import { CaseCard } from "@/components/CaseCard";
import { SourcesList } from "@/components/SourcesList";
import type { ResearchReport, StreamEvent } from "@/lib/types";

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(company: string) {
    setMessages([]);
    setReport(null);
    setError(null);
    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event: StreamEvent = JSON.parse(line);
          if (event.type === "progress" && event.message) {
            setMessages((prev) => [...prev, event.message as string]);
          } else if (event.type === "final" && event.report) {
            setReport(event.report);
          } else if (event.type === "error") {
            setError(event.message ?? "Unknown error");
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">AI Investment Research Agent</h1>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Enter a company name. The agent researches it, debates the case for and against,
          and gives you an Invest/Pass call with reasoning.
        </p>
      </div>

      <CompanyForm onSubmit={handleSubmit} disabled={isRunning} />

      {error && (
        <div className="w-full max-w-2xl rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <AgentProgress messages={messages} isDone={!isRunning && !!report} />

      {report && (
        <div className="flex w-full flex-col items-center gap-6">
          <DecisionCard entity={report.entity} decision={report.decision} />
          <RubricBreakdown rubric={report.rubric} />
          <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row">
            <CaseCard caseArg={report.bullCase} />
            <CaseCard caseArg={report.bearCase} />
          </div>
          <SourcesList sources={report.sources} />
        </div>
      )}
    </main>
  );
}
