import type { NextRequest } from "next/server";
import { serveArcade } from "@/lib/arcade/server";

export const runtime = "nodejs";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  return serveArcade(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: Context) {
  return serveArcade(request, (await context.params).path);
}
