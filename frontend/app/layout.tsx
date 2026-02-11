import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Playlist Classifier",
  description: "Spotify playlist duygu sınıflandırma uygulaması",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
