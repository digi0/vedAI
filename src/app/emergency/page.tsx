import { getTranslations } from "next-intl/server";
import { Card, SectionTitle, Badge } from "@/components/Card";
import PrintButton from "@/components/PrintButton";
import { getProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Emergency() {
  const profile = await getProfile();
  const t = await getTranslations("emergency");

  if (!profile) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] p-10 text-center text-[var(--color-fg-muted)]">
        {t("noProfile")}
      </div>
    );
  }

  const age = Math.floor(
    (Date.now() - new Date(profile.dob).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow={t("eyebrow")}
        title={t("title")}
        action={
          <div className="flex items-center gap-2">
            <Badge tone="alert">{t("criticalInfo")}</Badge>
            <PrintButton label={t("saveAsPdf")} />
          </div>
        }
      />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">
        {t("intro")}
      </p>

      <Card className="bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-brand-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--color-fg-dim)]">
              {t("patient")}
            </div>
            <div className="font-display text-3xl">{profile.name}</div>
            <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {t("dob")} {profile.dob} · {age} {t("yo")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-[var(--color-fg-dim)]">
              {t("bloodType")}
            </div>
            <div className="font-display text-4xl text-[var(--color-alert)]">
              {profile.bloodType}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-medium">{t("allergies")}</h3>
          <div className="flex flex-wrap gap-2">
            {profile.allergies.length === 0 ? (
              <span className="text-sm text-[var(--color-fg-muted)]">
                {t("noneOnFile")}
              </span>
            ) : (
              profile.allergies.map((a) => (
                <Badge key={a} tone="alert">
                  {a}
                </Badge>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium">{t("conditions")}</h3>
          <ul className="space-y-1 text-sm">
            {profile.conditions.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium">{t("currentMeds")}</h3>
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
          <h3 className="mb-3 font-medium">{t("emergencyContacts")}</h3>
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
          <h3 className="mb-3 font-medium">{t("primaryCare")}</h3>
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
          <h3 className="mb-3 font-medium">{t("insurance")}</h3>
          <div className="text-sm">
            <div>{profile.insurance.provider}</div>
            <div className="text-[var(--color-fg-muted)]">
              {t("policy")} {profile.insurance.policyNumber}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
