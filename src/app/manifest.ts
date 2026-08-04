import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BudgetTracker",
    short_name: "BudgetTracker",
    description: "Private household finance and bill tracking.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F6F2",
    theme_color: "#1D2924",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
