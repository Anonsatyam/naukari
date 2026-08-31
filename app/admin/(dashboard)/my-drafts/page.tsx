"use client";

import { DraftsListView } from "@/components/admin/DraftsListView";

export default function AdminManualDraftsPage() {
  return (
    <DraftsListView
      origin="manual"
      title="Drafts"
      description="Posts you created from scratch — edit, preview, publish, or delete them here."
      breadcrumbLabel="Drafts"
    />
  );
}
