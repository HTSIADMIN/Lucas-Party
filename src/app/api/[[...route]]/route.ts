// Every /api/* request lands here and is handed to the Hono app in src/server.
import { getServer } from "@/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  try {
    const { app } = await getServer();
    return await app.fetch(request);
  } catch (error) {
    console.error("[api] startup failed", error);
    const message = error instanceof Error ? error.message : "Server is not configured.";
    return Response.json({ error: message }, { status: 503 });
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
