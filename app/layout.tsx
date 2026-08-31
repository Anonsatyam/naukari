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
