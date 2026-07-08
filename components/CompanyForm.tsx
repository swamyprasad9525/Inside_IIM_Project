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
      className="flex w-full max-w-xl gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Enter a company name (e.g. Zomato, Stripe, Nvidia)"
        className="flex-1 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/30 disabled:opacity-50 dark:border-white/15 dark:bg-black/20"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-40"
      >
        {disabled ? "Researching…" : "Research"}
      </button>
    </form>
  );
}
