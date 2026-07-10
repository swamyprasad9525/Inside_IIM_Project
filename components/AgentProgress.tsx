"use client";

import { useEffect, useRef } from "react";

interface AgentProgressProps {
  messages: string[];
  isDone: boolean;
}

export function AgentProgress({ messages, isDone }: AgentProgressProps) {
  const scrollRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="clay w-full max-w-2xl p-5 text-sm">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--clay-purple-dark)]">
        {isDone ? "Agent trace" : "Agent working…"}
      </p>
      <ol ref={scrollRef} className="max-h-56 space-y-2 overflow-y-auto pr-1 scroll-smooth">
        {messages.map((m, i) => (
          <li key={i} className="flex gap-2 rounded-xl bg-[var(--clay-lavender)]/50 px-3 py-2">
            <span className="font-semibold text-[var(--clay-purple)]">{i + 1}.</span>
            <span>{m}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
