"use client";

import { useMemo, useRef, useState } from "react";
import { CompanyForm } from "@/components/CompanyForm";
import { AgentProgress } from "@/components/AgentProgress";
import { AgentMascot, type MascotState } from "@/components/AgentMascot";
import { BubbleBlob } from "@/components/BubbleBlob";
import { DecisionCard } from "@/components/DecisionCard";
import { RubricBreakdown } from "@/components/RubricBreakdown";
import { CaseCard } from "@/components/CaseCard";
import { SourcesList } from "@/components/SourcesList";
import { FollowUpChat } from "@/components/FollowUpChat";
import type { ResearchReport, StreamEvent } from "@/lib/types";

const THINKING_PATTERN = /resolv|gap check|self-critique/i;

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const mascotState: MascotState = useMemo(() => {
    if (error) return "error";
    if (report) return "success";
    if (!isRunning) return "idle";
    const last = messages[messages.length - 1] ?? "";
    return THINKING_PATTERN.test(last) ? "thinking" : "running";
  }, [error, report, isRunning, messages]);

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

  function handleCancel() {
    abortRef.current?.abort();
  }

  const isIdle = !isRunning && !report && !error;

  return (
    <>
      <div className="clay-blobs">
        <BubbleBlob className="clay-blob-1" />
        <BubbleBlob className="clay-blob-2" />
        <BubbleBlob className="clay-blob-3" />
        <BubbleBlob className="clay-blob-4" />
        <BubbleBlob className="clay-blob-5" />
      </div>

      <main
        className={`mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-6 px-6 py-16 ${
          isIdle ? "justify-center" : ""
        }`}
      >
        <div className="clay-fade-in flex flex-col items-center text-center">
          <AgentMascot state={mascotState} />
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--clay-purple-dark)]">
            AI Investment Research Agent
          </h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/60">
            Enter a company name. The agent researches it, debates the case for and against,
            and gives you an Invest/Pass call with reasoning.
          </p>
        </div>

        <div className="clay clay-fade-in w-full max-w-xl p-6" style={{ animationDelay: "0.1s" }}>
          <div className="flex flex-col items-center gap-3">
            <CompanyForm onSubmit={handleSubmit} disabled={isRunning} />
            {isRunning && (
              <button
                onClick={handleCancel}
                className="text-xs font-medium text-[var(--clay-purple-dark)]/60 underline underline-offset-2 hover:text-[var(--clay-purple-dark)]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="clay w-full max-w-2xl p-5 text-sm text-[var(--clay-peach-dark)]">
            {error}
          </div>
        )}

        <AgentProgress messages={messages} isDone={!isRunning && !!report} />

        {report && (
          <div className="flex w-full flex-col items-center gap-6">
            <DecisionCard
              entity={report.entity}
              decision={report.decision}
              selfReview={report.selfReview}
            />
            <RubricBreakdown rubric={report.rubric} />
            <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row">
              <CaseCard caseArg={report.bullCase} />
              <CaseCard caseArg={report.bearCase} />
            </div>
            <SourcesList sources={report.sources} />
            <FollowUpChat report={report} />
          </div>
        )}
      </main>
    </>
  );
}
