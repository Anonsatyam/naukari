import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sarkari Naukri — Government Jobs, Results & Admit Cards",
    short_name: "Sarkari Naukri",
    description:
      "Structured, verified government job listings, results and admit cards — sourced directly from official notifications.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#3c44c2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
