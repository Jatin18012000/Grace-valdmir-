import { describe, expect, it } from "vitest";
import { exportBibleJson, exportBibleMarkdown } from "@/core/character/export";
import { loadCharacterBibleFile, parseCharacterBible } from "@/core/character/load";
import { BIBLE_PATH } from "./helpers";

describe("Character Bible export", () => {
  const { bible } = loadCharacterBibleFile(BIBLE_PATH);

  it("JSON export round-trips through validation", () => {
    expect(parseCharacterBible(JSON.parse(exportBibleJson(bible)))).toEqual(bible);
  });

  it("Markdown export shows locked and pending attributes", () => {
    const md = exportBibleMarkdown(bible);
    expect(md).toContain("# Character Bible: Grace Vladmir");
    expect(md).toContain("| eyeColour | **LOCKED**: light blue |");
    expect(md).toContain("| hairColour | **LOCKED**: dark brown / near-black");
    expect(md).toMatch(/\| nose \| PENDING/);
    expect(md).toMatch(/\| faceShape \| PENDING/);
  });
});
