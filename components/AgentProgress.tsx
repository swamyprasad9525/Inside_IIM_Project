interface AgentProgressProps {
  messages: string[];
  isDone: boolean;
}

export function AgentProgress({ messages, isDone }: AgentProgressProps) {
  if (messages.length === 0) return null;

  return (
    <div className="w-full max-w-2xl rounded-lg border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]">
      <p className="mb-2 font-medium text-black/60 dark:text-white/60">
        {isDone ? "Agent trace" : "Agent working…"}
      </p>
      <ol className="space-y-1">
        {messages.map((m, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-black/30 dark:text-white/30">{i + 1}.</span>
            <span>{m}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
