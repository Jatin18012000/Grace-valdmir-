import { z } from "zod";
import { getAppContext } from "@/core/app-context";
import { exportBibleJson, exportBibleMarkdown } from "@/core/character/export";
import { getCharacter } from "@/core/character/repository";
import { AppError } from "@/core/errors";
import { withErrorHandling } from "@/core/http";

export const dynamic = "force-dynamic";

const formatSchema = z.enum(["json", "md"]).default("json");

export const GET = withErrorHandling(
  "api/characters/export",
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const format = formatSchema.safeParse(new URL(request.url).searchParams.get("format") ?? undefined);
    if (!format.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid export format", { userMessage: "format must be json or md" });
    }
    const character = getCharacter(getAppContext().db, id);
    if (!character) throw new AppError("NOT_FOUND", `Character "${id}" not found`, { userMessage: `Character "${id}" not found.` });

    const isJson = format.data === "json";
    const body = isJson ? exportBibleJson(character.bible) : exportBibleMarkdown(character.bible);
    return new Response(body, {
      headers: {
        "content-type": isJson ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
        "content-disposition": `inline; filename="${id}-bible.${format.data}"`,
      },
    });
  },
);
