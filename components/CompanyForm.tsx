"use client";

import { useState } from "react";

interface CompanyFormProps {
  onSubmit: (company: string) => void;
  disabled: boolean;
}

export function CompanyForm({ onSubmit, disabled }: CompanyFormProps) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
      className="flex w-full gap-3"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="e.g. Zomato, Stripe, Nvidia…"
        className="clay-inset min-w-0 flex-1 border-none px-5 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className={`clay-btn shrink-0 bg-gradient-to-br from-[var(--clay-purple)] to-[var(--clay-purple-dark)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40 ${
          disabled ? "is-loading" : ""
        }`}
      >
        {disabled ? "Researching…" : "Research"}
      </button>
    </form>
  );
}
