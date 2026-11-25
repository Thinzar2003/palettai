import type { MetadataRoute } from "next";

/** Makes Palettai installable ("Add to Home Screen"): it opens straight to Today, full screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Palettai — AI brand designer",
    short_name: "Palettai",
    description: "Daily posts, promos and replies in your brand style. Thai & English.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF8F3",
    theme_color: "#FF5A36",
    lang: "th",
    categories: ["business", "productivity", "design"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's post", short_name: "Post", url: "/today", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My brands", short_name: "Brands", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
