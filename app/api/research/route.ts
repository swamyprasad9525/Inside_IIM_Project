import type { NextRequest } from "next/server";
import { runResearchGraph } from "@/lib/graph/graph";
import type { StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        await runResearchGraph(company.trim(), send);
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
