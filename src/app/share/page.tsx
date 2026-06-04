import { getTranslations } from "next-intl/server";
import { SectionTitle, Card, Badge } from "@/components/Card";
import { supabaseServer } from "@/lib/supabase";
import ShareManager from "@/components/ShareManager";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  const t = await getTranslations("share");
  const sb = await supabaseServer();
  // RLS scopes share_tokens to the logged-in owner.
  const { data } = await sb
    .from("share_tokens")
    .select("*")
    .order("created_at", { ascending: false });

  const tokens = (data ?? []).map((t) => ({
    token: t.token,
    expiresAt: t.expires_at,
    createdAt: t.created_at,
    revokedAt: t.revoked_at,
    viewedCount: t.viewed_count,
  }));

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">
        {t("intro")}
      </p>

      <ShareManager tokens={tokens} />

      {tokens.length === 0 && (
        <Card>
          <p className="text-sm text-[var(--color-fg-muted)]">
            {t("noLinks")}
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {tokens.map((tok) => {
          const expired = new Date(tok.expiresAt) < new Date();
          const revoked = !!tok.revokedAt;
          const status = revoked
            ? { tone: "alert" as const, text: t("statusRevoked") }
            : expired
              ? { tone: "warn" as const, text: t("statusExpired") }
              : { tone: "ok" as const, text: t("statusActive") };

          return (
            <Card key={tok.token}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="truncate font-mono text-sm">
                      /share/{tok.token}
                    </code>
                    <Badge tone={status.tone}>{status.text}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-fg-muted)]">
                    {t("created")}{" "}
                    {new Date(tok.createdAt).toLocaleDateString()} · {t("expires")}{" "}
                    {new Date(tok.expiresAt).toLocaleString()} · {t("views")}{" "}
                    {tok.viewedCount}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
