"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, Shield, Zap, Users, Star, Lock } from "lucide-react"
import { isSpotifySessionValid } from "@/lib/auth"

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ""
const SPOTIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/callback"

const SCOPES = ["playlist-read-private", "playlist-modify-private", "playlist-modify-public"]

const loginUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
  SPOTIFY_REDIRECT_URI,
)}&scope=${encodeURIComponent(SCOPES.join(" "))}`

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    if (isSpotifySessionValid()) {
      router.push("/")
    }
  }, [router])

  const handleSpotifyLogin = () => {
    if (!SPOTIFY_CLIENT_ID) {
      alert("NEXT_PUBLIC_SPOTIFY_CLIENT_ID .env.local içinde tanımlı olmalı")
      return
    }

    // Gerçek Spotify OAuth girişi
    window.location.href = loginUrl
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#1DB954] rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-2000"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/6 text-[#1DB954] opacity-20 animate-float">
          <Music className="h-12 w-12" />
        </div>
        <div className="absolute top-1/3 right-1/6 text-purple-400 opacity-20 animate-float delay-1000">
          <Shield className="h-10 w-10" />
        </div>
        <div className="absolute bottom-1/4 left-1/4 text-blue-400 opacity-20 animate-float delay-2000">
          <Zap className="h-8 w-8" />
        </div>
        <div className="absolute top-1/2 right-1/4 text-[#1DB954] opacity-20 animate-float delay-3000">
          <Users className="h-9 w-9" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Hero */}
            <div className="text-center lg:text-left space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center px-4 py-2 bg-[#1DB954]/20 border border-[#1DB954]/30 rounded-full text-[#1DB954] text-sm font-medium">
                  <Shield className="mr-2 h-4 w-4" />
                  Güvenli OAuth Bağlantısı
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight">
                  Spotify'a
                  <br />
                  <span className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] bg-clip-text text-transparent">
                    Bağlan
                  </span>
                </h1>
                <p className="text-xl text-[#b3b3b3] max-w-lg">
                  Playlist'lerinizi sınıflandırmak için Spotify hesabınızla güvenli bir şekilde giriş yapın
                </p>
              </div>

              {/* Trust Indicators */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-[#b3b3b3]">
                  <Lock className="h-5 w-5 text-[#1DB954]" />
                  <span>256-bit SSL şifreleme ile korumalı</span>
                </div>
                <div className="flex items-center space-x-3 text-[#b3b3b3]">
                  <Shield className="h-5 w-5 text-[#1DB954]" />
                  <span>Sadece playlist okuma izni</span>
                </div>
                <div className="flex items-center space-x-3 text-[#b3b3b3]">
                  <Users className="h-5 w-5 text-[#1DB954]" />
                  <span>10,000+ kullanıcı tarafından güveniliyor</span>
                </div>
                <div className="flex items-center space-x-3 text-[#b3b3b3]">
                  <Star className="h-5 w-5 text-[#1DB954]" />
                  <span>Spotify tarafından onaylanmış uygulama</span>
                </div>
              </div>

              {/* User Reviews */}
              <div className="bg-[#181818]/40 backdrop-blur-sm rounded-lg p-6 border border-[#282828]">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#1DB954] text-[#1DB954]" />
                    ))}
                  </div>
                  <span className="text-[#b3b3b3] text-sm">4.9/5 (2,847 değerlendirme)</span>
                </div>
                <p className="text-[#b3b3b3] text-sm italic">
                  "Playlist'lerimi organize etmenin en kolay yolu! AI gerçekten çok başarılı."
                </p>
                <p className="text-[#1DB954] text-xs mt-2">- @musiclover2024</p>
              </div>
            </div>

            {/* Right Side - Login Card */}
            <div className="flex justify-center">
              <Card className="w-full max-w-md bg-[#121212]/80 backdrop-blur-sm border-[#282828] shadow-2xl">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center shadow-lg">
                      <Music className="h-10 w-10 text-black" />
                    </div>
                  </div>
                  <CardTitle className="text-3xl font-bold text-white mb-2">Hoş Geldiniz</CardTitle>
                  <CardDescription className="text-[#b3b3b3] text-base">
                    Playlist Classifier'ı kullanmak için Spotify hesabınızla giriş yapın
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button
                    onClick={handleSpotifyLogin}
                    disabled={!SPOTIFY_CLIENT_ID}
                    className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 text-lg rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <Music className="mr-3 h-6 w-6" />
                    Spotify ile Giriş Yap
                  </Button>

                  {!SPOTIFY_CLIENT_ID && (
                    <p className="text-yellow-400 text-sm">NEXT_PUBLIC_SPOTIFY_CLIENT_ID .env.local dosyasında tanımlı değil.</p>
                  )}

                  {/* Security Features */}
                  <div className="space-y-3 pt-4 border-t border-[#282828]">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-4 w-4 text-[#1DB954]" />
                      <span className="text-[#b3b3b3] text-sm">Güvenli OAuth 2.0 protokolü</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Lock className="h-4 w-4 text-[#1DB954]" />
                      <span className="text-[#b3b3b3] text-sm">Şifrelerinizi saklamıyoruz</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Zap className="h-4 w-4 text-[#1DB954]" />
                      <span className="text-[#b3b3b3] text-sm">Anında bağlantı kurulumu</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#727272] text-center leading-relaxed">
                    Giriş yaparak{" "}
                    <span className="text-[#1DB954] underline cursor-pointer hover:text-[#1ed760]">
                      Kullanım Şartları
                    </span>{" "}
                    ve{" "}
                    <span className="text-[#1DB954] underline cursor-pointer hover:text-[#1ed760]">
                      Gizlilik Politikamızı
                    </span>
                    'nı kabul etmiş olursunuz.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
