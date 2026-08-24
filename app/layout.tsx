import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bihar Sarkari Naukri — Bihar Government Jobs, Results & Admit Cards",
    template: "%s | Bihar Sarkari Naukri",
  },
  description:
    "Structured, verified Bihar government job listings, results and admit cards — sourced directly from official notifications. No login required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
