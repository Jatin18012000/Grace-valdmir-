import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CharacterBibleError, loadCharacterBibleFile, parseCharacterBible } from "@/core/character/load";
import { IDENTITY_FIELDS, lockedIdentityFields, pendingIdentityFields } from "@/core/character/schema";
import { BIBLE_PATH } from "./helpers";

const rawBible = () => JSON.parse(readFileSync(BIBLE_PATH, "utf8")) as Record<string, unknown> & {
  physicalIdentity: Record<string, unknown>;
  references: Array<Record<string, unknown>>;
};

describe("Grace Character Bible file", () => {
  const { bible } = loadCharacterBibleFile(BIBLE_PATH);

  it("is valid", () => {
    expect(bible.characterId).toBe("grace");
    expect(bible.name).toBe("Grace Vladmir");
  });

  it("locks exactly the approved identity values", () => {
    expect(Object.fromEntries(lockedIdentityFields(bible))).toEqual({
      eyeColour: "light blue",
      eyebrows: "defined, dark",
      lips: "full",
      facialStructure: "defined",
      cheekbones: "defined",
      skin: "warm / olive",
      hairColour: "dark brown / near-black",
      hairLength: "long",
    });
  });

  it("keeps nose and face shape PENDING with no value", () => {
    expect(bible.physicalIdentity.nose).toMatchObject({ status: "PENDING", value: null });
    expect(bible.physicalIdentity.faceShape).toMatchObject({ status: "PENDING", value: null });
    expect(pendingIdentityFields(bible)).toEqual(["eyeShape", "nose", "jaw", "faceShape", "facialProportions"]);
  });

  it("covers every identity field", () => {
    expect(Object.keys(bible.physicalIdentity).sort()).toEqual([...IDENTITY_FIELDS].sort());
  });

  it("has no approved references yet (none registered)", () => {
    expect(bible.references.every((r) => r.status === "PROPOSED" && r.localPath === null)).toBe(true);
  });
});

describe("Character Bible validation", () => {
  it("rejects a PENDING attribute that carries a guessed value", () => {
    const raw = rawBible();
    raw.physicalIdentity.nose = { status: "PENDING", value: "slim straight" };
    expect(() => parseCharacterBible(raw)).toThrow(CharacterBibleError);
  });

  it("rejects a LOCKED attribute without a source", () => {
    const raw = rawBible();
    raw.physicalIdentity.eyeColour = { status: "LOCKED", value: "light blue", lockedOn: "2026-09-27" };
    expect(() => parseCharacterBible(raw)).toThrow(CharacterBibleError);
  });

  it("rejects a missing identity field", () => {
    const raw = rawBible();
    delete raw.physicalIdentity.lips;
    expect(() => parseCharacterBible(raw)).toThrow(CharacterBibleError);
  });

  it("rejects unknown keys", () => {
    const raw = rawBible();
    raw.physicalIdentity.tattoo = { status: "PENDING", value: null };
    expect(() => parseCharacterBible(raw)).toThrow(CharacterBibleError);
  });

  it("rejects an APPROVED reference without a file and checksum", () => {
    const raw = rawBible();
    raw.references[0] = { ...raw.references[0], status: "APPROVED" };
    expect(() => parseCharacterBible(raw)).toThrow(/localPath and sha256/);
  });

  it("rejects two APPROVED primary identity references", () => {
    const raw = rawBible();
    const approved = { label: "x", category: "PRIMARY_IDENTITY", status: "APPROVED", localPath: "/a.png", sha256: "a".repeat(64) };
    raw.references = [approved, { ...approved, label: "y", localPath: "/b.png" }];
    expect(() => parseCharacterBible(raw)).toThrow(/Only one APPROVED PRIMARY_IDENTITY/);
  });
});
