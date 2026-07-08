# AI Investment Research Agent — Project Plan

Take-home assignment for InsideIIM × Altuni AI Labs (AI Product Development Engineer Intern).
Deadline: 7 days from receipt.

## 1. What we're building

An agent that takes a **company name** as input, researches it, and returns:
- An **Invest / Pass** decision
- The **reasoning** behind it (grounded in what it actually found)
- Supporting evidence: key facts, metrics, risks, sources

The assignment intentionally leaves "what it researches" and "how it decides" open — that's
the product judgment being evaluated. The plan below is one opinionated way to fill that gap.

## 2. Tech stack (matches assignment requirement)

| Layer      | Choice                                                              |
|------------|----------------------------------------------------------------------|
| Frontend   | Next.js 14 (App Router) + React + Tailwind                          |
| Backend    | Next.js API routes / Route Handlers (Node.js) — single deployable   |
| AI/agent   | LangGraph.js (stateful multi-step agent graph)                      |
| LLM        | Claude (Anthropic) or GPT-4o — pick one, pluggable via env var      |
| Search     | Tavily API (LLM-friendly web search, generous free tier)             |
| Deploy     | Vercel (bonus points)                                                |

Single Next.js app = one repo, one Vercel deploy, no CORS/two-server complexity.

## 3. Why an agent graph (not a single prompt)

A single "research and decide" prompt hallucinates numbers and skips steps under time pressure.
Splitting into a graph gives:
- Traceable intermediate state (useful for showing "how it thinks" in the UI)
- Ability to retry/branch a single step without redoing everything
- A natural place to enforce "decision must cite evidence" (structured output validation)

## 4. LangGraph flow

```
        ┌──────────────┐
        │   Intake     │  parse company name, resolve ambiguity
        │  (identify)  │  (e.g. "Zomato" -> ticker ZOMATO.NS, sector, HQ)
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │   Research   │  parallel sub-searches:
        │   (fan-out)  │   - business model / what they do
        │              │   - recent news (last 6-12 months)
        │              │   - financials (revenue, growth, profitability if public)
        │              │   - competition / moat
        │              │   - risks / red flags (lawsuits, controversies, leadership churn)
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  Synthesize  │  LLM condenses raw search results into structured
        │              │  findings per category, with source links kept
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │   Analyze    │  LLM scores against an explicit rubric (see §5),
        │  (score)     │  producing per-factor scores + short justification
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │   Decide     │  LLM combines rubric scores -> Invest/Pass + confidence
        │              │  + top 3 reasons for, top 3 reasons against
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │   Report     │  assembles final structured JSON for the UI
        └──────────────┘
```

Each node is a LangGraph node with typed state (Zod schema). Research fan-out runs sub-searches
concurrently via `Promise.all`, then joins before Synthesize.

## 5. Decision rubric (keeps the LLM's judgment consistent & explainable)

Score 1–5 on each, LLM must justify each score with a cited fact from research:

1. **Business fundamentals** — is the business model sound, is revenue/growth trending well
2. **Market position** — competitive moat, market size, differentiation
3. **Leadership & execution** — founder/leadership track record, recent execution signals
4. **Financial health** — profitability path, funding runway / balance sheet (if data available)
5. **Risk factors** — regulatory, legal, reputational, market risk (inverse-scored)

Weighted sum -> threshold -> Invest / Pass, plus a confidence level (Low/Med/High) based on
how much verifiable data was actually found (a company with thin public data should surface
lower confidence, not a false-precise score).

## 6. Data sources (what "research" means here)

- **Web search**: Tavily (or SerpAPI) for news, company info, general web presence
- **Optional financials** (nice-to-have, only for public companies): a free stock API
  (e.g. Alpha Vantage / Yahoo Finance unofficial endpoint) for revenue/market cap/growth if ticker resolves
- Everything else (private companies, startups) relies on web search + LLM synthesis — call this
  out explicitly in the README as a limitation

## 7. Project structure

```
/investment-research-agent
├── app/
│   ├── page.tsx                 # input form + results UI
│   ├── api/
│   │   └── research/route.ts    # POST { company } -> runs LangGraph, streams progress
│   └── layout.tsx
├── lib/
│   ├── graph/
│   │   ├── state.ts             # Zod schema for graph state
│   │   ├── nodes/
│   │   │   ├── intake.ts
│   │   │   ├── research.ts
│   │   │   ├── synthesize.ts
│   │   │   ├── analyze.ts
│   │   │   ├── decide.ts
│   │   │   └── report.ts
│   │   └── graph.ts             # wires nodes together with LangGraph
│   ├── llm.ts                   # LLM client wrapper (provider-agnostic)
│   ├── search.ts                # Tavily client wrapper
│   └── financials.ts            # optional stock data wrapper
├── components/
│   ├── CompanyForm.tsx
│   ├── AgentProgress.tsx        # shows live step-by-step status
│   ├── DecisionCard.tsx         # Invest/Pass badge + confidence
│   ├── RubricBreakdown.tsx      # per-factor scores + justification
│   └── SourcesList.tsx
├── .env.example
├── README.md
└── task.md                      # this file
```

## 8. UI/UX approach

- Single input box: "Enter a company name"
- On submit: streamed progress ("Identifying company…", "Researching financials…",
  "Scoring against rubric…", "Deciding…") via Server-Sent Events or simple polling — makes the
  agent's multi-step nature visible, which is part of what's being evaluated
- Result view:
  - Big Invest/Pass badge + confidence level
  - 3 reasons for / 3 reasons against, in plain language
  - Rubric breakdown (5 factors, score + one-line justification each)
  - Sources list (links from search)
- Keep it clean and information-dense rather than flashy — this is a decision tool, not a marketing page

## 9. Key decisions & trade-offs to note in README

- Chose Tavily over generic Google scraping — faster, LLM-optimized, avoids scraping legal/ToS issues
- Rubric-based scoring instead of freeform reasoning — trades some flexibility for consistency and auditability
- No portfolio/backtesting/quantitative modeling — scope is a single-company qualitative+available-quant decision, not a full analyst platform
- Financial API integration only for public companies — private company financials aren't reliably available for free, called out as a known gap
- Single Next.js app instead of separate frontend/backend — simpler deploy, matches "Node.js or Next.js" backend option in the brief

## 10. What to improve with more time (README section, decide honestly once built)

Candidates: real-time financial statement parsing (10-Ks/10-Qs), multi-turn follow-up Q&A on a
decision, comparison mode (company vs. peers), caching/re-run diffing, evaluation harness to
test decision consistency across repeated runs.

## 11. Build plan / order of work

1. Scaffold Next.js app, env setup, verify LLM + Tavily keys work with a trivial call
2. Define Zod state schema + stub graph with hardcoded pass-through nodes
3. Implement Research node (search fan-out) end-to-end, log raw output
4. Implement Synthesize -> Analyze -> Decide -> Report nodes
5. Wire API route to run graph and stream progress
6. Build UI: form -> progress -> result
7. Run against 4-5 real companies (mix of well-known public + a smaller/private one) to sanity-check
8. Write README (all required sections) + gather LLM chat transcripts used while building
9. Deploy to Vercel, smoke-test the deployed link
10. Final pass: error handling for bad/unknown company names, empty search results, LLM refusals

## 12. Things to decide before starting (ambiguous points, make a call + note in README)

- Which LLM provider (cost/quality/rate-limit tradeoffs)
- How to handle a company name that's ambiguous (e.g. "Apple" the fruit vs. Apple Inc.) — plan:
  ask LLM to resolve to most likely entity, show what it resolved to in the UI so user can correct
- How to handle companies with almost no public info — plan: lower confidence, don't force a
  fabricated score
