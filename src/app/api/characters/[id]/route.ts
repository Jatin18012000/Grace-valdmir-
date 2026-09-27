import { NextResponse } from "next/server";
import { getAppContext } from "@/core/app-context";
import { getCharacter } from "@/core/character/repository";
import { AppError } from "@/core/errors";
import { withErrorHandling } from "@/core/http";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(
  "api/characters",
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const character = getCharacter(getAppContext().db, id);
    if (!character) throw new AppError("NOT_FOUND", `Character "${id}" not found`, { userMessage: `Character "${id}" not found.` });
    return NextResponse.json(character);
  },
);
