import Link from "next/link";
import { Card, SectionTitle, Badge } from "@/components/Card";
import MetricChart from "@/components/MetricChart";
import RecordItem from "@/components/RecordItem";
import { records, metrics, insights, profile } from "@/lib/mock";

export default function Overview() {
  const recentRecords = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const featuredMetrics = metrics.filter((m) =>
    ["bp_sys", "weight", "glucose", "sleep_hrs"].includes(m.key),
  );
  const topInsights = insights.slice(0, 2);

  return (
    <div className="space-y-10">
      <section>
        <div className="font-display text-3xl text-[var(--color-fg-muted)] italic">
          Hello, {profile.name.split(" ")[0]}.
        </div>
        <h1 className="font-display text-4xl sm:text-5xl">
          Your health, in one place.
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--color-fg-muted)]">
          Records, trends, and the things any doctor would want to know — all
          one tap away. In an emergency, share your full profile instantly.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/share/demo-token-abc123"
            className="rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm text-white"
          >
            Share with doctor
          </Link>
          <Link
            href="/emergency"
            className="rounded-md border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm"
          >
            Emergency card
          </Link>
          <Link
            href="/records"
            className="rounded-md border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm"
          >
            Upload record
          </Link>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="At a glance"
          title="Key metrics"
          action={
            <Link
              href="/metrics"
              className="text-sm text-[var(--color-brand)] hover:underline"
            >
              See all →
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredMetrics.map((m) => (
            <MetricChart key={m.key} series={m} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle
            eyebrow="Recent activity"
            title="Latest records"
            action={
              <Link
                href="/records"
                className="text-sm text-[var(--color-brand)] hover:underline"
              >
                See all →
              </Link>
            }
          />
          <div className="space-y-3">
            {recentRecords.map((r) => (
              <RecordItem key={r.id} record={r} />
            ))}
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="What we noticed" title="Insights" />
          <div className="space-y-3">
            {topInsights.map((i) => (
              <Card key={i.id}>
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge
                    tone={
                      i.severity === "alert"
                        ? "alert"
                        : i.severity === "watch"
                          ? "warn"
                          : "ok"
                    }
                  >
                    {i.severity}
                  </Badge>
                </div>
                <h3 className="font-medium">{i.title}</h3>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  {i.detail}
                </p>
              </Card>
            ))}
            <Link
              href="/insights"
              className="block text-sm text-[var(--color-brand)] hover:underline"
            >
              All insights →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
