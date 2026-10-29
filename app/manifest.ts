import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deutsch DTZ — немецкий с нуля до B1",
    short_name: "Deutsch DTZ",
    description: "Немецкий A1→B1, подготовка к DTZ и Leben in Deutschland",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#120c2e",
    theme_color: "#120c2e",
    lang: "ru",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
