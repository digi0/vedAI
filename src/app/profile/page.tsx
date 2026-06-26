import { getTranslations } from "next-intl/server";
import { SectionTitle } from "@/components/Card";
import ProfileForm from "@/components/ProfileForm";
import { getProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();
  const t = await getTranslations("profile");

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />
      <p className="max-w-2xl text-sm text-[var(--color-fg-muted)]">{t("intro")}</p>
      <ProfileForm initial={profile} />
    </div>
  );
}
