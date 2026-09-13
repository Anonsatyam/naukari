import type { Metadata, Viewport } from "next";
import { Roboto, Poppins } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const roboto = Roboto({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-roboto",
  display: "swap",
});

// Poppins (by Indian Type Foundry) ships a native Devanagari subset, so it
// covers Hindi directly rather than falling back to another family.
const poppinsHindi = Poppins({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-poppins-hindi",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sarkari Naukri — Government Jobs, Results & Admit Cards",
    template: "%s | Sarkari Naukri",
  },
  description:
    "Structured, verified government job listings, results and admit cards — sourced directly from official notifications. No login required.",
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Sarkari Naukri",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#3c44c2",
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('theme');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${roboto.variable} ${poppinsHindi.variable} antialiased`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
