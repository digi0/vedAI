import { Card, Badge } from "@/components/Card";
import RecordItem from "@/components/RecordItem";
import MetricChart from "@/components/MetricChart";
import {
  getShareByToken,
  bumpShareView,
  getProfile,
  listRecords,
  listMetrics,
  listInsights,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DoctorShare({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await getShareByToken(token);

  if (!share) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-alert-soft)] p-6">
        <h1 className="font-display text-2xl">Link not found</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          This share link is invalid. Ask the patient to generate a new one.
        </p>
      </div>
    );
  }

  const expired = new Date(share.expiresAt) < new Date();
  const revoked = !!share.revokedAt;
  if (expired || revoked) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-warn-soft)] p-6">
        <h1 className="font-display text-2xl">
          Link {revoked ? "revoked" : "expired"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Ask the patient to generate a new share link.
        </p>
      </div>
    );
  }

  // Fetch only the sections the token owner chose to share.
  const [profile, records, metrics, insights] = await Promise.all([
    share.includeProfile
      ? getProfile({ userId: share.userId, admin: true })
      : Promise.resolve(null),
    share.includeRecords
      ? listRecords({ userId: share.userId, admin: true })
      : Promise.resolve([]),
    share.includeMetrics
      ? listMetrics({ userId: share.userId, admin: true })
      : Promise.resolve([]),
    share.includeMetrics
      ? listInsights({ userId: share.userId, admin: true })
      : Promise.resolve([]),
  ]);

  // best-effort view counter — don't block render
  bumpShareView(token).catch(() => {});

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
              Expires {new Date(share.expiresAt).toLocaleString()}. No data can
              be edited from this view.
            </p>
          </div>
          <Badge tone="brand">Secure view</Badge>
        </div>
      </div>

      {profile && (
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
      )}

      <section>
        <h2 className="mb-3 font-display text-xl">Recent metrics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
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
          {records.map((r) => (
            <RecordItem key={r.id} record={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
