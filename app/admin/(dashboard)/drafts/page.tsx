"use client";

import { DraftsListView } from "@/components/admin/DraftsListView";

export default function AdminBotDraftsPage() {
  return (
    <DraftsListView
      origin="bot"
      title="Bot Drafts"
      description="Notifications detected by the bot, waiting for your review before they go live."
      breadcrumbLabel="Bot Drafts"
    />
  );
}
