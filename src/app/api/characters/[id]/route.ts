import { NextResponse } from "next/server";
import { getAppContext } from "@/core/app-context";
import { getCharacter } from "@/core/character/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const character = getCharacter(getAppContext().db, id);
  if (!character) return NextResponse.json({ error: `Character "${id}" not found` }, { status: 404 });
  return NextResponse.json(character);
}
