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
    icons: [{ src: "/budgettracker-mark.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
