import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ved AI — your health, in one place",
    short_name: "Ved AI",
    description:
      "Your personal health vault: records, metrics, insights, and a one-tap share for emergencies.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#0d6e62",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
