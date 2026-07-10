"use client";

import { useMemo, useRef, useState } from "react";
import { CompanyForm } from "@/components/CompanyForm";
import { AgentProgress } from "@/components/AgentProgress";
import { AgentMascot, type MascotSprite } from "@/components/AgentMascot";
import { BubbleBlob } from "@/components/BubbleBlob";
import { DecisionCard } from "@/components/DecisionCard";
import { RubricBreakdown } from "@/components/RubricBreakdown";
import { CaseCard } from "@/components/CaseCard";
import { SourcesList } from "@/components/SourcesList";
import { FollowUpChat } from "@/components/FollowUpChat";
import type { ResearchReport, StreamEvent } from "@/lib/types";

interface PhaseRule {
  pattern: RegExp;
  sprite: MascotSprite;
  label: string;
}

// Checked in order against the latest trace message, first match wins — gives the pet
// a distinct pose + label for each pipeline phase instead of one repeated "running" loop.
const PHASE_RULES: PhaseRule[] = [
  { pattern: /revised thesis/i, sprite: "waving", label: "Caught something, fixing it…" },
  { pattern: /self-critique/i, sprite: "thinking", label: "Double-checking the call…" },
  { pattern: /^decision:/i, sprite: "thinking", label: "Weighing it all up…" },
  { pattern: /bear case/i, sprite: "running-left", label: "Building the bear case…" },
  { pattern: /bull case/i, sprite: "running-right", label: "Building the bull case…" },
  { pattern: /rubric scored/i, sprite: "waiting", label: "Scoring the rubric…" },
  { pattern: /gap check/i, sprite: "thinking", label: "Checking for gaps…" },
  { pattern: /synthesized/i, sprite: "waiting", label: "Reading through it all…" },
  { pattern: /peer comparison/i, sprite: "waiting", label: "Checking out the competition…" },
  { pattern: /research round/i, sprite: "running", label: "Searching the web…" },
  { pattern: /resolved/i, sprite: "thinking", label: "Figuring out who you mean…" },
];

function deriveMascot(
  error: string | null,
  report: ResearchReport | null,
  isRunning: boolean,
  messages: string[]
): { sprite: MascotSprite; label: string } {
  if (error) return { sprite: "error", label: "Hit a snag" };
  if (report) return { sprite: "success", label: "Hurray! Done" };
  if (!isRunning) return { sprite: "idle", label: "Ready when you are" };

  const last = messages[messages.length - 1] ?? "";
  const rule = PHASE_RULES.find((r) => r.pattern.test(last));
  return rule ? { sprite: rule.sprite, label: rule.label } : { sprite: "running", label: "Researching…" };
}

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const mascot = useMemo(
    () => deriveMascot(error, report, isRunning, messages),
    [error, report, isRunning, messages]
  );

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
        className={`mx-auto flex w-full flex-1 flex-col items-center gap-6 px-6 py-16 ${
          isIdle ? "justify-center" : ""
        }`}
      >
        <div className="clay-fade-in flex w-full max-w-2xl flex-col items-center text-center">
          <AgentMascot sprite={mascot.sprite} label={mascot.label} isActive={isRunning} />
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

        <div className="w-full max-w-2xl">
          <AgentProgress messages={messages} isDone={!isRunning && !!report} />
        </div>

        {report && (
          <div className="flex w-full max-w-6xl flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
              <div className="flex flex-col gap-6">
                <div className="clay-fade-in">
                  <DecisionCard
                    entity={report.entity}
                    decision={report.decision}
                    selfReview={report.selfReview}
                  />
                </div>
                <div className="clay-fade-in" style={{ animationDelay: "0.08s" }}>
                  <RubricBreakdown rubric={report.rubric} />
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <div className="clay-fade-in" style={{ animationDelay: "0.16s" }}>
                  <CaseCard caseArg={report.bullCase} sources={report.sources} />
                </div>
                <div className="clay-fade-in" style={{ animationDelay: "0.22s" }}>
                  <CaseCard caseArg={report.bearCase} sources={report.sources} />
                </div>
                <div className="clay-fade-in" style={{ animationDelay: "0.3s" }}>
                  <FollowUpChat report={report} />
                </div>
              </div>
            </div>
            <div className="clay-fade-in" style={{ animationDelay: "0.36s" }}>
              <SourcesList sources={report.sources} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
