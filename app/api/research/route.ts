import type { NextRequest } from "next/server";
import { runResearchGraph } from "@/lib/graph/graph";
import { getCachedReport, setCachedReport } from "@/lib/cache";
import type { StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// Stay safely under maxDuration so we can send a clean error and close the stream
// ourselves, instead of the platform silently killing the function mid-response and
// leaving the client's fetch reader hanging with no explanation.
const PIPELINE_TIMEOUT_MS = 270_000;

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `Research timed out after ${Math.round(
              ms / 1000
            )}s — this usually means the LLM provider is rate-limited or slow right now. Try again in a minute.`
          )
        ),
      ms
    );
  });
}

export async function POST(req: NextRequest) {
  let company: string;
  try {
    const body = await req.json();
    company = body?.company;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!company || typeof company !== "string" || !company.trim()) {
    return new Response(JSON.stringify({ error: "Company name is required" }), { status: 400 });
  }

  const trimmedCompany = company.trim();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      const cached = getCachedReport(trimmedCompany);
      if (cached) {
        send({ type: "progress", message: "Using a cached result from within the last hour" });
        send({ type: "final", report: cached });
        controller.close();
        return;
      }

      try {
        await Promise.race([
          runResearchGraph(trimmedCompany, (event) => {
            send(event);
            if (event.type === "final" && event.report) {
              setCachedReport(trimmedCompany, event.report);
            }
          }),
          timeoutAfter(PIPELINE_TIMEOUT_MS),
        ]);
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error occurred",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
