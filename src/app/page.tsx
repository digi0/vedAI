import Link from "next/link";
import { Card, SectionTitle, Badge } from "@/components/Card";
import MetricChart from "@/components/MetricChart";
import RecordItem from "@/components/RecordItem";
import { listRecords, listMetrics, getProfile, listInsights } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const [records, metrics, profile, insights] = await Promise.all([
    listRecords(),
    listMetrics(),
    getProfile(),
    listInsights(),
  ]);

  const recentRecords = records.slice(0, 3);
  const featuredMetrics = metrics.filter((m) =>
    ["bp_sys", "weight", "glucose", "sleep_hrs"].includes(m.key),
  );
  const topInsights = insights.slice(0, 2);
  const firstName = (profile?.name ?? "there").split(" ")[0];

  const metricsInRange = metrics.filter((m) => {
    const last = m.points[m.points.length - 1]?.value;
    return (
      last !== undefined &&
      m.healthyRange &&
      last >= m.healthyRange[0] &&
      last <= m.healthyRange[1]
    );
  }).length;
  const totalTracked = metrics.filter((m) => m.points.length > 0).length;
  const alertCount = insights.filter((i) => i.severity === "alert").length;

  return (
    <div className="space-y-12">
      {/* Tight, focused hero. */}
      <section>
        <p className="text-base text-[var(--color-fg-muted)]">
          Hello, {firstName}.
        </p>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] sm:text-5xl">
          Your health, in one place.
        </h1>
        <p className="mt-4 max-w-xl text-[var(--color-fg-muted)]">
          Records, trends, and the things any doctor would want to know — all
          one tap away.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link
            href="/share"
            className="rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-strong)]"
          >
            Share with doctor
          </Link>
          <Link
            href="/pharmacy"
            className="rounded-md border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm hover:bg-[var(--color-surface-2)]"
          >
            Order medication
          </Link>
          <Link
            href="/emergency"
            className="rounded-md border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm hover:bg-[var(--color-surface-2)]"
          >
            Emergency card
          </Link>
        </div>
      </section>

      {/* Snapshot strip — clickable stat tiles full-width on desktop. */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/metrics"
          className="card-interactive fade-up fade-up-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <div className="font-display text-3xl text-[var(--color-brand-strong)]">
            {metricsInRange}
            <span className="text-base text-[var(--color-fg-dim)]">
              /{totalTracked}
            </span>
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
            Metrics in range
          </div>
        </Link>
        <Link
          href="/records"
          className="card-interactive fade-up fade-up-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <div className="font-display text-3xl">{records.length}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
            Records on file
          </div>
        </Link>
        <Link
          href="/insights"
          className="card-interactive fade-up fade-up-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <div className="font-display text-3xl">{alertCount}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
            {alertCount === 1 ? "Insight to review" : "Insights to review"}
          </div>
        </Link>
      </section>

      <section>
        <SectionTitle
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredMetrics.map((m) => (
            <MetricChart key={m.key} series={m} />
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
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
          <div className="space-y-4">
            {recentRecords.length === 0 ? (
              <Card>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  No records yet. Upload your first one from the Records page.
                </p>
              </Card>
            ) : (
              recentRecords.map((r) => <RecordItem key={r.id} record={r} />)
            )}
          </div>
        </div>
        <div>
          <SectionTitle title="Insights" />
          <div className="space-y-4">
            {topInsights.map((i) => {
              const rail =
                i.severity === "alert"
                  ? "border-l-[var(--color-alert)]"
                  : i.severity === "watch"
                    ? "border-l-[var(--color-warn)]"
                    : "border-l-[var(--color-brand)]";
              return (
                <Card key={i.id} className={`border-l-4 ${rail}`}>
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
              );
            })}
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
