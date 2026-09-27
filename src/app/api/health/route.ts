import { NextResponse } from "next/server";
import { getSystemStatus } from "@/core/status";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSystemStatus());
}
