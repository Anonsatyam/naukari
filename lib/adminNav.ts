import { LayoutDashboard, Briefcase, PenSquare, NotebookPen } from "lucide-react";

export const ADMIN_NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/create-post", label: "Create Post", icon: PenSquare },
  { href: "/admin/my-drafts", label: "Drafts", icon: NotebookPen },
  { href: "/admin/jobs", label: "Manage Jobs", icon: Briefcase },
];
