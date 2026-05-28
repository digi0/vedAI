import { Card, SectionTitle, Badge } from "@/components/Card";
import { listInsights } from "@/lib/db";
import RegenerateInsightsButton from "@/components/RegenerateInsightsButton";

const toneOf = (sev: string) =>
  sev === "alert" ? "alert" : sev === "watch" ? "warn" : "ok";

export const dynamic = "force-dynamic";

export default async function Insights() {
  const insights = await listInsights();
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="What we noticed"
        title="Insights"
        action={<RegenerateInsightsButton />}
      />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">
        Patterns drawn from your records and metrics by a local LLM (Ollama).
        These are signals, not diagnoses — always discuss with your doctor.
      </p>
      {insights.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-fg-muted)]">
            No insights yet. Upload a record or log some metrics, then click
            <strong> Regenerate </strong> above. The model reads your
            structured data and writes the insights you see here.
          </p>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {insights.map((i) => (
          <Card key={i.id}>
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={toneOf(i.severity) as "alert" | "warn" | "ok"}>
                {i.severity}
              </Badge>
            </div>
            <h3 className="font-display text-xl">{i.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-fg)]">{i.detail}</p>
            <div className="mt-3 rounded-md bg-[var(--color-brand-soft)] p-3 text-sm text-[var(--color-fg)]">
              <span className="font-medium text-[var(--color-brand)]">
                Suggestion:{" "}
              </span>
              {i.suggestion}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
