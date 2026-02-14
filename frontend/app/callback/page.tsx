"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { clearSpotifySession, saveSpotifySession } from "@/lib/auth"
import { browserError, browserLog, getApiBaseUrl, getSpotifyRedirectUri } from "@/lib/runtime-config"

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const fetchToken = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code")
      const apiBaseUrl = getApiBaseUrl()
      const redirectUri = getSpotifyRedirectUri()

      if (!code) {
        clearSpotifySession()
        browserError("callback", "Spotify'dan yetki kodu alınamadı")
        router.push("/login")
        return
      }

      try {
        browserLog("callback", "Token isteği gönderiliyor", { apiBaseUrl, redirectUri })

        const response = await fetch(`${apiBaseUrl}/spotify/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        })

        const data = await response.json()
        browserLog("callback", "Token cevabı alındı", {
          status: response.status,
          ok: response.ok,
          hasAccessToken: Boolean(data.access_token),
          hasRefreshToken: Boolean(data.refresh_token),
          expiresIn: data.expires_in,
          error: data.error || data.detail || null,
        })

        if (data.access_token) {
          saveSpotifySession(data.access_token, data.expires_in, data.refresh_token)
          browserLog("callback", "Spotify oturumu kaydedildi")
          router.push("/")
        } else {
          clearSpotifySession()
          browserError("callback", "Erişim token'ı alınamadı", data)
          router.push("/login")
        }
      } catch (error) {
        clearSpotifySession()
        browserError("callback", "Token isteği başarısız oldu", error)
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
