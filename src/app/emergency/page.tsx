import { Card, SectionTitle, Badge } from "@/components/Card";
import { profile } from "@/lib/mock";

export default function Emergency() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="In an emergency"
        title="Emergency card"
        action={
          <Badge tone="alert">⚠ Critical info</Badge>
        }
      />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">
        The one page any first-responder or new doctor needs. Pin to your lock
        screen — accessible without unlocking your account.
      </p>

      <Card className="bg-gradient-to-br from-white to-[var(--color-brand-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--color-fg-dim)]">
              Patient
            </div>
            <div className="font-display text-3xl">{profile.name}</div>
            <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
              DOB {profile.dob} ·{" "}
              {Math.floor(
                (Date.now() - new Date(profile.dob).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000),
              )}{" "}
              y/o
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-[var(--color-fg-dim)]">
              Blood type
            </div>
            <div className="font-display text-4xl text-[var(--color-alert)]">
              {profile.bloodType}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-medium">Allergies</h3>
          <div className="flex flex-wrap gap-2">
            {profile.allergies.map((a) => (
              <Badge key={a} tone="alert">
                {a}
              </Badge>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium">Conditions</h3>
          <ul className="space-y-1 text-sm">
            {profile.conditions.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium">Current medications</h3>
          <ul className="space-y-2 text-sm">
            {profile.medications.map((m) => (
              <li key={m.name} className="flex justify-between gap-3">
                <span>
                  <span className="font-medium">{m.name}</span>{" "}
                  <span className="text-[var(--color-fg-muted)]">{m.dose}</span>
                </span>
                <span className="text-[var(--color-fg-muted)]">
                  {m.frequency}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium">Emergency contacts</h3>
          <ul className="space-y-2 text-sm">
            {profile.emergencyContacts.map((c) => (
              <li key={c.name} className="flex justify-between gap-3">
                <span>
                  <span className="font-medium">{c.name}</span>{" "}
                  <span className="text-[var(--color-fg-muted)]">
                    ({c.relation})
                  </span>
                </span>
                <a
                  href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}
                  className="text-[var(--color-brand)] hover:underline"
                >
                  {c.phone}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium">Primary care</h3>
          <div className="text-sm">
            <div className="font-medium">{profile.primaryDoctor.name}</div>
            <a
              href={`tel:${profile.primaryDoctor.phone.replace(/[^+\d]/g, "")}`}
              className="text-[var(--color-brand)] hover:underline"
            >
              {profile.primaryDoctor.phone}
            </a>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium">Insurance</h3>
          <div className="text-sm">
            <div>{profile.insurance.provider}</div>
            <div className="text-[var(--color-fg-muted)]">
              Policy {profile.insurance.policyNumber}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
