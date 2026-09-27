import type { HealthResult } from "@/core/providers/health";
import { getSystemStatus } from "@/core/status";

export const dynamic = "force-dynamic";

function HealthCard({ title, health }: { title: string; health: HealthResult }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <span className={`badge ${health.state}`}>{health.state}</span>
      <p className="muted">
        <code>{health.url}</code>
        {health.latencyMs !== null ? ` · ${health.latencyMs} ms` : ""}
      </p>
      {health.error ? <p className="muted">Error: {health.error}</p> : null}
      {Object.keys(health.details).length > 0 ? <pre>{JSON.stringify(health.details, null, 2)}</pre> : null}
    </div>
  );
}

export default async function OverviewPage() {
  const status = await getSystemStatus();
  const bible = status.characterBible;
  return (
    <>
      <h1>Overview</h1>
      <p className="muted">Live status, checked {status.checkedAt}. Reload the page to check again.</p>
      <div className="grid">
        <HealthCard title="ComfyUI" health={status.comfyui} />
        <HealthCard title={`LLM (${status.llm.provider})`} health={status.llm} />
        <div className="card">
          <h2>Database (SQLite)</h2>
          <p className="muted"><code>{status.database.path}</code></p>
          <p>
            Migrations: {status.database.migrations.map((m) => `${m.id}:${m.name}`).join(", ") || "none"}
            <br />
            Characters stored: {status.database.characterCount}
          </p>
        </div>
        <div className="card">
          <h2>Character Bible</h2>
          <span className={`badge ${bible.outcome}`}>{bible.outcome}</span>
          {bible.outcome === "ERROR" ? (
            <pre>{bible.error}</pre>
          ) : (
            <p className="muted">sha256 {bible.sha256.slice(0, 16)}…</p>
          )}
        </div>
      </div>
    </>
  );
}
