import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

// Admin pages always need live data (pending drafts, job statuses, bot
// activity) — never pre-render these at build time, or every admin would
// see a stale snapshot from whenever the site was last deployed instead
// of what's actually true right now. This applies to every page nested
// under this layout, current and future, without needing to repeat it.
export const dynamic = "force-dynamic";

export default function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AdminTopbar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
