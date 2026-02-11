"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, ExternalLink, Sparkles, Brain, Zap, Heart, TrendingUp, Users, Clock } from "lucide-react"
import { clearSpotifySession, isSpotifySessionValid } from "@/lib/auth"

export default function HomePage() {
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!isSpotifySessionValid()) {
      clearSpotifySession()
      router.push("/login")
    } else {
      setIsLoggedIn(true)
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidSpotifyUrl(playlistUrl.trim())) {
      localStorage.setItem("playlist_url", playlistUrl.trim())
      localStorage.removeItem("emotions")
      localStorage.removeItem("classification_results")
      localStorage.removeItem("saved_playlists")
      localStorage.removeItem("example_batch")
      localStorage.removeItem("total_songs")
      router.push("/emotions")
    }
  }

  const isValidSpotifyUrl = (url: string) => {
    return url.includes("spotify.com/playlist/") || url.includes("open.spotify.com/playlist/")
  }

  if (!isLoggedIn) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-white">Yükleniyor...</div>
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#1DB954] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 text-[#1DB954] opacity-30 animate-bounce">
          <Music className="h-8 w-8" />
        </div>
        <div className="absolute top-1/3 right-1/4 text-purple-400 opacity-30 animate-bounce delay-500">
          <Heart className="h-6 w-6" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 text-blue-400 opacity-30 animate-bounce delay-1000">
          <Sparkles className="h-7 w-7" />
        </div>
        <div className="absolute top-1/2 right-1/3 text-[#1DB954] opacity-30 animate-bounce delay-1500">
          <Zap className="h-5 w-5" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-6xl">
          <div className="text-center space-y-8 mb-16">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-[#1DB954]/20 border border-[#1DB954]/30 rounded-full text-[#1DB954] text-sm font-medium">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Destekli Müzik Analizi
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight">
                Playlist
                <br />
                <span className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] bg-clip-text text-transparent">
                  Classifier
                </span>
              </h1>
              <p className="text-xl text-[#b3b3b3] max-w-3xl mx-auto">
                Spotify playlist'lerinizi duygu durumlarına göre sınıflandırın. Yapay zeka ile müzik keşfetmenin yeni yolu.
              </p>
            </div>
          </div>

          <div className="flex justify-center mb-16">
            <Card className="w-full max-w-md bg-[#121212]/80 backdrop-blur-sm border-[#282828] shadow-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center shadow-lg">
                    <Music className="h-8 w-8 text-black" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white">Hemen Başlayın</CardTitle>
                <CardDescription className="text-[#b3b3b3]">
                  Spotify playlist'inizi duygu durumlarına göre sınıflandırın
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="playlist-url" className="text-white font-medium">
                      Spotify Playlist URL'si
                    </Label>
                    <Input
                      id="playlist-url"
                      type="url"
                      placeholder="https://open.spotify.com/playlist/..."
                      value={playlistUrl}
                      onChange={(e) => setPlaylistUrl(e.target.value)}
                      required
                      className="bg-[#282828] border-[#404040] text-white placeholder:text-[#b3b3b3] focus:border-[#1DB954] focus:ring-[#1DB954]"
                    />
                    <p className="text-sm text-[#b3b3b3] flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Spotify'dan playlist linkini kopyalayıp buraya yapıştırın
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
                    disabled={!isValidSpotifyUrl(playlistUrl)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analizi Başlat
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-16">
            <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
              <Brain className="h-8 w-8 text-[#1DB954]" />
              <span className="text-sm">AI Destekli Analiz</span>
            </div>
            <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
              <Zap className="h-8 w-8 text-[#1DB954]" />
              <span className="text-sm">Hızlı İşleme</span>
            </div>
            <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
              <Heart className="h-8 w-8 text-[#1DB954]" />
              <span className="text-sm">Duygu Analizi</span>
            </div>
            <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
              <Music className="h-8 w-8 text-[#1DB954]" />
              <span className="text-sm">Otomatik Playlist</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[#181818]/60 backdrop-blur-sm border-[#282828] hover:bg-[#282828]/60 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-[#1DB954] mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Gelişmiş Analiz</h3>
                <p className="text-[#b3b3b3] text-sm">
                  Ses özellikleri, tempo, enerji seviyesi ve daha fazlasını analiz ederek en doğru sınıflandırmayı yapar
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#181818]/60 backdrop-blur-sm border-[#282828] hover:bg-[#282828]/60 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-[#1DB954] mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Topluluk Destekli</h3>
                <p className="text-[#b3b3b3] text-sm">
                  Binlerce kullanıcının verisiyle sürekli öğrenen AI, her geçen gün daha iyi sonuçlar üretir
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#181818]/60 backdrop-blur-sm border-[#282828] hover:bg-[#282828]/60 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 text-[#1DB954] mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Hızlı İşlem</h3>
                <p className="text-[#b3b3b3] text-sm">
                  Ortalama 30 saniyede playlist'inizi analiz eder ve yeni kategorilere ayırır
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
