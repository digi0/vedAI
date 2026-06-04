import { Card, SectionTitle, Badge } from "@/components/Card";
import { listInsights } from "@/lib/db";
import RegenerateInsightsButton from "@/components/RegenerateInsightsButton";

const toneOf = (sev: string) =>
  sev === "alert" ? "alert" : sev === "watch" ? "warn" : "ok";

export const dynamic = "force-dynamic";
// The Claude insight call can take several seconds; raise the function
// timeout above Vercel's 10s default so it isn't killed mid-generation.
export const maxDuration = 60;

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
        Patterns we spotted across your records and metrics. These are signals
        to explore, not diagnoses — always check with your doctor.
      </p>
      {insights.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-fg-muted)]">
            No insights yet. Upload a record or log a few metrics, then tap
            <strong> Regenerate </strong> and we&apos;ll surface the patterns
            worth a closer look.
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
