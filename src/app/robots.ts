import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: "https://budgettracker-five-zeta.vercel.app/sitemap.xml",
  };
}
