import { IDENTITY_FIELDS, type CharacterBible } from "./schema";

/** Pretty JSON export (machine-readable). */
export function exportBibleJson(bible: CharacterBible): string {
  return `${JSON.stringify(bible, null, 2)}\n`;
}

type Field =
  | { status: "SET"; value: string | string[] }
  | { status: "LOCKED"; value: string }
  | { status: "PENDING"; value: null; note?: string | undefined };

function show(field: Field): string {
  if (field.status === "PENDING") return `PENDING${field.note ? ` (${field.note})` : ""}`;
  const value = Array.isArray(field.value) ? field.value.join(", ") : field.value;
  return field.status === "LOCKED" ? `**LOCKED**: ${value}` : value;
}

/** Human-readable Markdown export for debugging and documentation. */
export function exportBibleMarkdown(bible: CharacterBible): string {
  const lines: string[] = [];
  lines.push(`# Character Bible: ${bible.name}`, "");
  lines.push(`- Character ID: \`${bible.characterId}\``);
  lines.push(`- Schema version: ${bible.schemaVersion}`);
  lines.push(`- Summary: ${bible.identity.summary}`, "");

  lines.push("## Physical identity", "", "| Attribute | Status / value | Source |", "|---|---|---|");
  for (const key of IDENTITY_FIELDS) {
    const attr = bible.physicalIdentity[key];
    const source = attr.status === "LOCKED" ? `${attr.source} (${attr.lockedOn})` : "";
    const note = attr.status === "LOCKED" && attr.note ? ` (${attr.note})` : "";
    lines.push(`| ${key} | ${show(attr)}${note} | ${source} |`);
  }

  lines.push("", "## Identity profile", "");
  lines.push(`- Username: ${show(bible.identity.username)}`);
  lines.push(`- Biography: ${show(bible.identity.biography)}`);
  lines.push(`- Languages: ${show(bible.identity.languages)}`);
  lines.push(`- Target audience: ${show(bible.identity.targetAudience)}`);

  lines.push("", "## Personality", "");
  for (const [key, field] of Object.entries(bible.personality)) lines.push(`- ${key}: ${show(field)}`);

  lines.push("", "## Communication style", "");
  for (const [key, field] of Object.entries(bible.communicationStyle)) lines.push(`- ${key}: ${show(field)}`);

  lines.push("", "## Niche", "", `- Primary: ${bible.niche.primary}`);
  lines.push(`- Secondary: ${bible.niche.secondary.join(", ")}`);
  for (const rule of bible.niche.rules) lines.push(`- Rule: ${rule}`);

  lines.push("", "## Visual style", "");
  for (const [key, field] of Object.entries(bible.visualStyle)) lines.push(`- ${key}: ${show(field)}`);

  lines.push("", "## Wardrobe", "", `- Rule: ${bible.wardrobe.rule}`);
  lines.push(`- Categories: ${bible.wardrobe.categories.join(", ")}`);

  lines.push("", "## Variable attributes", "", ...bible.variableAttributes.map((a) => `- ${a}`));
  lines.push("", "## Generation constraints", "", ...bible.generationConstraints.map((c) => `- ${c}`));

  lines.push("", "## References", "");
  if (bible.references.length === 0) lines.push("None registered.");
  for (const ref of bible.references) {
    lines.push(
      `- ${ref.label}: ${ref.category}, ${ref.status}, file: ${ref.localPath ?? "not registered"}, sha256: ${ref.sha256 ?? "none"}${ref.note ? ` (${ref.note})` : ""}`,
    );
  }
  return `${lines.join("\n")}\n`;
}
