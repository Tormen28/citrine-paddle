import type React from "react"
import type { Metadata } from "next"
import { Lexend_Deca } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const lexendDeca = Lexend_Deca({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ya Te Cambio — Dashboard P2P USDT/VES",
  description: "Dashboard del ecosistema Ya Te Cambio: analiza precios y tendencias del mercado P2P USDT/VES (Binance, BCV y más)",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head />
      <body className={lexendDeca.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
