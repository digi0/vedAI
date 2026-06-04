import { getTranslations } from "next-intl/server";
import { Card, SectionTitle } from "@/components/Card";
import { listInsights, type Insight } from "@/lib/db";
import RegenerateInsightsButton from "@/components/RegenerateInsightsButton";
import { TriangleAlert, Activity, Lightbulb, Sparkles, type LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GROUPS: {
  sev: Insight["severity"];
  icon: LucideIcon;
  color: string;
}[] = [
  { sev: "alert", icon: TriangleAlert, color: "var(--color-alert)" },
  { sev: "watch", icon: Activity, color: "var(--color-warn)" },
  { sev: "info", icon: Lightbulb, color: "var(--color-brand)" },
];

export default async function Insights() {
  const insights = await listInsights();
  const t = await getTranslations("insights");

  return (
    <div className="space-y-8">
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} action={<RegenerateInsightsButton />} />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">
        {t("intro")}
      </p>

      {insights.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-fg-muted)]">
            {t("empty")}
          </p>
        </Card>
      ) : (
        GROUPS.map(({ sev, icon: Icon, color }) => {
          const items = insights.filter((i) => i.severity === sev);
          if (items.length === 0) return null;
          return (
            <section key={sev}>
              <div className="mb-3 flex items-center gap-2">
                <Icon size={16} style={{ color }} />
                <h2 className="font-display text-xl">{t(sev)}</h2>
                <span className="text-sm text-[var(--color-fg-dim)]">{items.length}</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((i) => (
                  <div
                    key={i.id}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <h3 className="font-medium">{i.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-fg-muted)]">
                      {i.detail}
                    </p>
                    {i.suggestion && (
                      <div className="mt-3 flex items-start gap-2 border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-fg)]">
                        <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--color-brand)]" />
                        <span>{i.suggestion}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
