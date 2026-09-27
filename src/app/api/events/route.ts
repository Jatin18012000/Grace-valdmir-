import { NextResponse } from "next/server";
import { getAppContext } from "@/core/app-context";
import { listEvents } from "@/core/events";
import { withErrorHandling } from "@/core/http";

export const dynamic = "force-dynamic";

/** GET /api/events?eventType=&minSeverity=&entityType=&entityId=&beforeId=&limit= (newest first) */
export const GET = withErrorHandling("api/events", (request: Request) => {
  const query = Object.fromEntries(new URL(request.url).searchParams.entries());
  return NextResponse.json({ events: listEvents(getAppContext().db, query) });
});
