import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ChatMessagesSettings } from "@/components/settings/ChatMessagesSettings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings.chatMessages" });

  return {
    title: t("title"),
  };
}

export default function ChatMessagesSettingsPage() {
  return <ChatMessagesSettings />;
}
