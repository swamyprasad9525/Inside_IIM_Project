# AI Investment Research Agent

Takes a company name, researches it (web search + real financial data + SEC filings), debates
the case for and against, and returns an **Invest / Pass** decision with cited reasoning.

Built for the InsideIIM × Altuni AI Labs AI Product Development Engineer take-home assignment.

## Overview

Enter a company name. The agent:

1. Resolves the name to a specific company (handles ambiguity, e.g. "Apple" the fruit vs. Apple Inc.)
2. Researches it across 5 angles (overview, news, financials, competition, risks) via web search,
   plus real structured financial data (Alpha Vantage) and multi-year SEC filing data (EDGAR)
   when the company is public
3. Checks its own research for critical gaps and runs a second, targeted round of searches if needed
4. Scores the company against a fixed 5-factor rubric, citing evidence for every score
5. Runs a **bull case** and **bear case** in parallel — two independent LLM calls arguing the
   strongest honest case for and against investing
6. **Judges** the debate into a final Invest/Pass verdict with a confidence level
7. **Self-critiques** the decision against the underlying findings, catching unsupported claims
   or contradictions before finalizing
8. Streams all of this live to the UI as an "agent trace," then shows the final decision, rubric
   breakdown, both sides of the debate, and every source cited

You can also ask follow-up questions about a completed report (e.g. "what's driving the risk
score?") without triggering a new research run.

## How to run it

```bash
npm install
cp .env.example .env.local   # then fill in the keys below
npm run dev
```

Open `http://localhost:3000`.

### Keys needed (all free tier)

| Env var | Where to get it | Required? |
|---|---|---|
| `NVIDIA_NIM_API_KEY` | [build.nvidia.com](https://build.nvidia.com) — free API credits | Yes |
| `NVIDIA_NIM_BASE_URL` | Defaults to `https://integrate.api.nvidia.com/v1` | No |
| `NVIDIA_NIM_MODEL` | Defaults to `meta/llama-3.1-70b-instruct` | No |
| `NVIDIA_NIM_FAST_MODEL` | Defaults to `meta/llama-3.1-8b-instruct` | No |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) — free, 1,000 searches/month | Yes |
| `ALPHA_VANTAGE_API_KEY` | [alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key) — free, 25 requests/day | No — app degrades gracefully without it (no verified financials/DCF/peer comparison, findings rely on web search only) |

SEC EDGAR (multi-year filings data) needs no key at all — it's a free public API.

## How it works

**Stack:** Next.js (App Router, single deployable) · LangGraph.js for the agent · NVIDIA NIM
(hosted open-weight LLMs, OpenAI-compatible API) · Tavily (web search) · Alpha Vantage + SEC
EDGAR (real financial data).

**Why an agent graph instead of one big prompt:** a single "research and decide" prompt
hallucinates numbers and skips steps under time pressure. Splitting into a LangGraph graph gives
traceable intermediate state (shown live as the "agent trace"), a natural place to loop back for
more research when evidence is thin, and parallel branches for the bull/bear debate.

```
        START
          │
        intake ──────────┐
          │               │
       research         peer          (parallel: web search + real financials
          │               │            vs. naming/fetching a competitor)
          └──────┬────────┘
              synthesize
                  │
              gapcheck ───┐
                  │        │ (loops back to research if critical
              (loop)◄──────┘  gaps found, max 1 extra round)
                  │
               analyze (5-factor rubric, cited)
                  │
          ┌───────┴───────┐
        bull            bear          (parallel: strongest honest case
          │               │            for vs. against investing)
          └───────┬───────┘
                judge  (weighs both sides → verdict + confidence)
                  │
              critique  (self-checks the decision against the evidence,
                  │       revises if it finds a contradiction)
                  │
                report
                  │
                 END
```

**Node-by-node:**

- **intake** — resolves the company name to a specific entity (sector, public/private, ticker
  guess), using the fast 8B model since this is a simple lookup task
- **research** — fans out 5 Tavily searches (overview/news/financials/competition/risks) plus,
  for public companies, real structured data from Alpha Vantage (P/E, margins, growth) and SEC
  EDGAR (multi-year revenue/net income from actual 10-K filings, plus a simplified illustrative
  DCF estimate)
- **peer** — names the closest public competitor and fetches its financial snapshot, so "market
  position" scoring has an actual comparison point, not just qualitative claims
- **synthesize** — condenses all raw sources into structured findings; every claim must cite a
  source ID
- **gapcheck** — asks whether critical information is missing (e.g. no financials found at all)
  and triggers one targeted follow-up round if so
- **analyze** — scores 5 factors (business fundamentals, market position, leadership, financial
  health, risk) 1-5, each with a cited justification
- **bull / bear** — two independent LLM calls building the strongest honest case for and against,
  run in parallel as separate graph branches
- **judge** — weighs both cases plus the rubric into a final verdict + confidence level
- **critique** — re-reads the decision against the findings looking for unsupported claims or
  contradictions, and revises the thesis if it finds one (surfaced in the UI as a
  "✓ self-reviewed and revised" badge when it actually happens)
- **report** — assembles the final structured result for the UI

**Structured output approach:** every node that needs structured data uses a prompt-based
JSON contract (`lib/llm.ts: structuredCall`) with a one-shot repair retry, rather than native
function/tool calling. This was a deliberate choice — open-weight models served via NIM have
inconsistent tool-calling support, while prompt-based JSON + Zod validation works uniformly
across any OpenAI-compatible endpoint.

## Key decisions & trade-offs

- **NVIDIA NIM over a closed-model API** — free hosted access to open-weight models
  (Llama 3.1) via an OpenAI-compatible endpoint, no cost to build/test. Trade-off: noticeably
  less consistent than GPT-4o/Claude — hit real rate limits (429s) and occasional malformed
  JSON during testing. Mitigated with retries and graceful degradation (see below), not
  eliminated.
- **Two-tier model routing** — the 70B model handles synthesis/rubric/debate/decision (where
  reasoning quality matters most); the 8B model handles simple lookups (entity resolution,
  yes/no gap checks) to cut latency without touching decision quality.
- **Bull/bear debate as parallel graph branches, not one "weigh both sides" prompt** — a single
  prompt asked to argue both sides tends to hedge. Two independent calls each committed to one
  side produce sharper, more defensible arguments for the judge to weigh.
- **Graceful degradation over all-or-nothing** — if the bear case or self-critique fails after
  retries (which happened live during testing, from a real NIM rate limit), the pipeline
  completes with a note in the trace instead of losing the whole multi-minute run. If either
  side of the debate is missing, confidence is deterministically capped at Medium — a decision
  from a one-sided debate shouldn't claim High confidence.
- **Evidence-linked reasoning** — every claim in findings, rubric scores, and the bull/bear cases
  cites a source ID, shown in the UI's sources list. Trades some prose fluency for auditability.
- **Prompt-injection hardening** — raw web content is wrapped in `<untrusted_web_content>` tags
  with an explicit instruction to treat it as data, not instructions, since search results are
  untrusted third-party text that could contain injected directives.
- **Real financial data over LLM-only claims** — Alpha Vantage (official free API) for current
  fundamentals and SEC EDGAR (official free API, no key needed) for multi-year filing data,
  instead of trusting the LLM's summarization of news snippets for numbers. A ticker-resolution
  bug found during testing (Alpha Vantage's fuzzy search returned a German Xetra listing tied
  with the real US ticker) is fixed by preferring US listings and trusting the LLM's own ticker
  guess when it appears in the results.
- **In-memory caching, not a real cache store** — repeat runs on the same company return
  instantly for the life of the server process. Left as in-memory rather than Redis/Vercel KV
  since a single-process demo doesn't need it; noted as the first thing to swap for a real
  multi-instance deployment.
- **What was deliberately left out**: portfolio-level/multi-company screening, adjustable rubric
  weights, page-level citation into specific filing paragraphs (cites the filing, not the exact
  line), and a rigorous DCF (the included DCF is intentionally simple/illustrative, clearly
  labeled as such, not a substitute for real valuation modeling).

## Example runs

Full JSON reports available on request / in the chat transcript. Summary of live test runs:

**Zomato** → **INVEST**, Medium confidence, rubric 4.0/5. Multi-source revenue model, first
full-year profit in FY24 cited as strengths; Indian regulatory challenges and competition from
Swiggy cited as risks.

**NVIDIA** → **INVEST**, High confidence, rubric 4.4/5. Self-critique caught and flagged a real
internal contradiction (two conflicting revenue-growth figures — 22% vs. 80.8% — from
differently-dated sources) and revised the thesis to note it rather than silently picking one.

**Tesla** → **INVEST**, confidence deterministically capped at Medium because the bear case
failed to generate after a real NIM rate limit (429) mid-run — the pipeline completed anyway
instead of losing the whole run, demonstrating the graceful-degradation design under an actual
failure, not just a simulated one.

**Microsoft** → **INVEST**, rubric 4.2/5. Self-critique flagged that the initial thesis didn't
address AI/cloud competitive risk or recent layoffs, and revised it before finalizing.

## What I would improve with more time

- Persist the SEC EDGAR ticker map to disk instead of re-fetching on every server start —
  during heavy testing this tripped SEC's rate limit (403), a pure testing artifact since a
  real deployment doesn't restart every few minutes, but worth fixing properly
- A request queue/backoff for Alpha Vantage calls — peer comparison occasionally fails under
  concurrent load from research + peer both hitting the API at once
- Page/paragraph-level citation into SEC filings instead of citing the filing as a whole
- Adjustable rubric weights so a user can say "I care more about growth than risk"
- Comparable-company benchmarking beyond a single named peer
- A real cache store (Redis/Vercel KV) for multi-instance deployments
- An eval harness that reruns the same company multiple times to measure decision consistency

## Ambiguous-call notes

- Ambiguous company names (e.g. a common word) are resolved to the most likely well-known
  company by the LLM, with the assumption shown in the UI so the user can catch a wrong guess
- Confidence reflects how much verifiable evidence was actually found, not just how convincing
  the LLM's prose sounds — thin evidence caps confidence regardless of verdict direction
