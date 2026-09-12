import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sarkari Naukri — Government Jobs, Results & Admit Cards",
    template: "%s | Sarkari Naukri",
  },
  description:
    "Structured, verified government job listings, results and admit cards — sourced directly from official notifications. No login required.",
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('theme');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
