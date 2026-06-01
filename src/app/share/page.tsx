import { SectionTitle, Card, Badge } from "@/components/Card";
import { supabaseServer } from "@/lib/supabase";
import ShareManager from "@/components/ShareManager";

export const dynamic = "force-dynamic";

export default async function SharePage() {
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
      <SectionTitle eyebrow="For your doctor" title="Share links" />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">
        Generate a read-only link any doctor can open in their browser. No
        login required on their side. Links expire automatically and you can
        revoke them anytime.
      </p>

      <ShareManager tokens={tokens} />

      {tokens.length === 0 && (
        <Card>
          <p className="text-sm text-[var(--color-fg-muted)]">
            No active share links. Generate one above.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {tokens.map((t) => {
          const expired = new Date(t.expiresAt) < new Date();
          const revoked = !!t.revokedAt;
          const status = revoked
            ? { tone: "alert" as const, text: "revoked" }
            : expired
              ? { tone: "warn" as const, text: "expired" }
              : { tone: "ok" as const, text: "active" };

          return (
            <Card key={t.token}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="truncate font-mono text-sm">
                      /share/{t.token}
                    </code>
                    <Badge tone={status.tone}>{status.text}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-fg-muted)]">
                    Created{" "}
                    {new Date(t.createdAt).toLocaleDateString()} · Expires{" "}
                    {new Date(t.expiresAt).toLocaleString()} · Views{" "}
                    {t.viewedCount}
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
