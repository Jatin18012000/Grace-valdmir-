import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext } from "@/core/app-context";
import { AppError } from "@/core/errors";
import { withErrorHandling } from "@/core/http";
import { getAllSettings, isSettingKey, updateSetting } from "@/core/settings";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling("api/settings", () =>
  NextResponse.json({ settings: getAllSettings(getAppContext().db) }),
);

const patchSchema = z.strictObject({ key: z.string(), value: z.unknown() });

/** PATCH /api/settings { "key": "autopilot_mode", "value": "SUPERVISED" } */
export const PATCH = withErrorHandling("api/settings", async (request: Request) => {
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    throw new AppError("VALIDATION_ERROR", "Invalid settings update body", {
      userMessage: 'Body must be JSON: { "key": string, "value": ... }',
    });
  }
  const { key, value } = body.data;
  if (!isSettingKey(key)) {
    throw new AppError("VALIDATION_ERROR", `Unknown setting "${key}"`, { userMessage: `Unknown setting "${key}".` });
  }
  const { db, config } = getAppContext();
  const updated = updateSetting(db, key, value, { allowFullAutopilot: config.allowFullAutopilot }, "api");
  return NextResponse.json({ setting: updated });
});
