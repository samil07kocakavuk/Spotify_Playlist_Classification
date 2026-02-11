"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { clearSpotifySession, saveSpotifySession } from "@/lib/auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const fetchToken = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code")

      if (!code) {
        clearSpotifySession()
        console.error("Spotify'dan yetki kodu alınamadı")
        router.push("/login")
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/spotify/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ code })
        })

        const data = await response.json()

        if (data.access_token) {
          saveSpotifySession(data.access_token, data.expires_in, data.refresh_token)
          router.push("/")
        } else {
          clearSpotifySession()
          console.error("Erişim token'ı alınamadı", data)
          router.push("/login")
        }
      } catch (error) {
        clearSpotifySession()
        console.error("Token isteği başarısız oldu", error)
        router.push("/login")
      }
    }

    fetchToken()
  }, [router])

  return (
    <div className="text-white flex items-center justify-center min-h-screen">
      Spotify'a bağlanılıyor...
    </div>
  )
}
