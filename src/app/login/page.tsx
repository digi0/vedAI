import { getTranslations } from "next-intl/server";
import AuthForm from "@/components/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const t = await getTranslations("auth");
  // /auth/confirm sends people here when a mailed link is stale or reused.
  const notice = error === "link_invalid" ? t("linkInvalid") : undefined;

  return <AuthForm mode="login" next={next} notice={notice} />;
}
