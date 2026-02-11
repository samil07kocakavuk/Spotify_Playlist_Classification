"use client"

import type { ReactNode } from "react"

interface SpotifyLayoutProps {
  children: ReactNode
  showPlayer?: boolean
}

export function SpotifyLayout({ children, showPlayer = false }: SpotifyLayoutProps) {
  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Main Content - Full Width */}
      <div className="flex-1 bg-gradient-to-b from-[#1e3a5f] to-[#121212] overflow-auto">{children}</div>
    </div>
  )
}
