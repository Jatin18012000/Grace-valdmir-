import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext } from "@/core/app-context";
import { exportBibleJson, exportBibleMarkdown } from "@/core/character/export";
import { getCharacter } from "@/core/character/repository";

export const dynamic = "force-dynamic";

const formatSchema = z.enum(["json", "md"]).default("json");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = formatSchema.safeParse(new URL(request.url).searchParams.get("format") ?? undefined);
  if (!format.success) return NextResponse.json({ error: "format must be json or md" }, { status: 400 });

  const character = getCharacter(getAppContext().db, id);
  if (!character) return NextResponse.json({ error: `Character "${id}" not found` }, { status: 404 });

  const isJson = format.data === "json";
  const body = isJson ? exportBibleJson(character.bible) : exportBibleMarkdown(character.bible);
  return new Response(body, {
    headers: {
      "content-type": isJson ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${id}-bible.${format.data}"`,
    },
  });
}
