import { Card, Badge } from "@/components/Card";
import RecordItem from "@/components/RecordItem";
import MetricChart from "@/components/MetricChart";
import { profile, records, metrics, insights } from "@/lib/mock";

export default async function DoctorShare({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-brand-soft)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-brand)]">
              Read-only · shared by patient
            </div>
            <h1 className="font-display text-2xl">
              Patient summary for clinicians
            </h1>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Share link <code className="font-mono">{token}</code> · expires in
              72 hours. No data can be edited from this view.
            </p>
          </div>
          <Badge tone="brand">Secure view</Badge>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--color-fg-dim)]">
              Patient
            </div>
            <div className="font-display text-2xl">{profile.name}</div>
            <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
              DOB {profile.dob} · Blood type {profile.bloodType}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-[var(--color-fg-dim)]">Primary care</div>
            <div className="font-medium">{profile.primaryDoctor.name}</div>
            <div className="text-[var(--color-fg-muted)]">
              {profile.primaryDoctor.phone}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">
              Allergies
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.allergies.map((a) => (
                <Badge key={a} tone="alert">
                  {a}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">
              Conditions
            </div>
            <ul className="space-y-0.5 text-sm">
              {profile.conditions.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-fg-dim)]">
              Medications
            </div>
            <ul className="space-y-0.5 text-sm">
              {profile.medications.map((m) => (
                <li key={m.name}>
                  • {m.name} {m.dose} — {m.frequency}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-xl">Recent metrics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.slice(0, 6).map((m) => (
            <MetricChart key={m.key} series={m} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl">Flagged insights</h2>
        <div className="space-y-3">
          {insights
            .filter((i) => i.severity !== "info")
            .map((i) => (
              <Card key={i.id}>
                <div className="mb-1.5">
                  <Badge tone={i.severity === "alert" ? "alert" : "warn"}>
                    {i.severity}
                  </Badge>
                </div>
                <h3 className="font-medium">{i.title}</h3>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  {i.detail}
                </p>
              </Card>
            ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl">Records timeline</h2>
        <div className="space-y-3">
          {[...records]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((r) => (
              <RecordItem key={r.id} record={r} />
            ))}
        </div>
      </section>
    </div>
  );
}
