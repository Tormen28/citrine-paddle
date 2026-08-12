import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ya Te Cambio — Dashboard P2P USDT/VES",
    short_name: "Ya Te Cambio",
    description:
      "Dashboard del ecosistema Ya Te Cambio: analiza precios y tendencias del mercado P2P USDT/VES (Binance, BCV y más)",
    start_url: "/",
    display: "standalone",
    background_color: "#0E0D09",
    theme_color: "#0E0D09",
    lang: "es",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
