import Link from "next/link";
import { getAppContext } from "@/core/app-context";
import { getCharacter } from "@/core/character/repository";
import { IDENTITY_FIELDS } from "@/core/character/schema";

export const dynamic = "force-dynamic";

export default function GracePage() {
  const character = getCharacter(getAppContext().db, "grace");
  if (!character) {
    return (
      <>
        <h1>Grace</h1>
        <p>Character not loaded. Check the Character Bible status on the Overview page.</p>
      </>
    );
  }
  const { bible } = character;
  return (
    <>
      <h1>{bible.name}</h1>
      <p className="muted">
        {bible.identity.summary} Bible version {character.bibleSha256.slice(0, 12)}…, {character.versionCount} version(s) stored.
        Export: <Link href="/api/characters/grace/export?format=json" prefetch={false}>JSON</Link> · <Link href="/api/characters/grace/export?format=md" prefetch={false}>Markdown</Link>
      </p>

      <h2>Physical identity</h2>
      <table>
        <thead>
          <tr><th>Attribute</th><th>Status</th><th>Value</th><th>Source</th></tr>
        </thead>
        <tbody>
          {IDENTITY_FIELDS.map((field) => {
            const attr = bible.physicalIdentity[field];
            return (
              <tr key={field}>
                <td>{field}</td>
                <td><span className={`badge ${attr.status}`}>{attr.status}</span></td>
                <td>{attr.value ?? "—"}{attr.note ? <div className="muted">{attr.note}</div> : null}</td>
                <td className="muted">{attr.status === "LOCKED" ? `${attr.source}, ${attr.lockedOn}` : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Niche</h2>
      <p>{bible.niche.primary}. Secondary: {bible.niche.secondary.join(", ")}.</p>

      <h2>References</h2>
      <p className="muted">Reference management is a later phase. Images stay on the owner&apos;s Mac, never in git.</p>
      <table>
        <thead>
          <tr><th>Label</th><th>Category</th><th>Status</th><th>File</th></tr>
        </thead>
        <tbody>
          {bible.references.map((ref) => (
            <tr key={ref.label}>
              <td>{ref.label}{ref.note ? <div className="muted">{ref.note}</div> : null}</td>
              <td>{ref.category}</td>
              <td><span className={`badge ${ref.status}`}>{ref.status}</span></td>
              <td className="muted">{ref.localPath ?? "not registered"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
