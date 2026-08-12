import type React from "react"
import type { Metadata, Viewport } from "next"
import { Lexend_Deca } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PwaRegister } from "@/components/pwa-register"
import { OfflineBanner } from "@/components/offline-banner"
import { InstallPrompt } from "@/components/install-prompt"

const lexendDeca = Lexend_Deca({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ya Te Cambio — Dashboard P2P USDT/VES",
  description:
    "Dashboard del ecosistema Ya Te Cambio: analiza precios y tendencias del mercado P2P USDT/VES (Binance, BCV y más)",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ya Te Cambio",
  },
  icons: {
    icon: "/icon-32.png",
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#0E0D09",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head />
      <body className={lexendDeca.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <OfflineBanner />
          {children}
          <Toaster />
          <PwaRegister />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
