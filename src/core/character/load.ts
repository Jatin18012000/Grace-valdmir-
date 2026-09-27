import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { characterBibleSchema, type CharacterBible } from "./schema";

export class CharacterBibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterBibleError";
  }
}

export function parseCharacterBible(input: unknown): CharacterBible {
  const result = characterBibleSchema.safeParse(input);
  if (!result.success) {
    throw new CharacterBibleError(`Invalid Character Bible:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export interface LoadedBible {
  bible: CharacterBible;
  /** Canonical JSON (stable key order as written) and its SHA-256, for versioning. */
  canonicalJson: string;
  sha256: string;
  sourcePath: string;
}

export function loadCharacterBibleFile(filePath: string): LoadedBible {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new CharacterBibleError(`Cannot read Character Bible at ${filePath}: ${String(error)}`);
  }
  const bible = parseCharacterBible(raw);
  const canonicalJson = JSON.stringify(bible);
  return { bible, canonicalJson, sha256: sha256(canonicalJson), sourcePath: filePath };
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
