import { NextResponse } from "next/server";
import { withErrorHandling } from "@/core/http";
import { getSystemStatus } from "@/core/status";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling("api/health", async () => NextResponse.json(await getSystemStatus()));
