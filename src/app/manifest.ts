import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prode Mundial 2026",
    short_name: "Prode",
    description: "Pronosticá los partidos del Mundial con tus amigos",
    start_url: "/",
    display: "standalone",
    background_color: "#0a7d2c",
    theme_color: "#0a7d2c",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
