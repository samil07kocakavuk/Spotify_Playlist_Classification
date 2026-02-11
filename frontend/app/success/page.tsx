"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Music, Home, ExternalLink, Sparkles, TrendingUp, Users, Clock } from "lucide-react"
import { clearSpotifySession, isSpotifySessionValid } from "@/lib/auth"

type TrackItem = {
  id?: string | null
  name?: string
  artist?: string
  url?: string
}

type ClassificationResult = {
  grouped_tracks?: Record<string, TrackItem[]>
}

type CreatedPlaylist = {
  emotion: string
  playlist_id: string
  playlist_name: string
  playlist_url: string
  added_tracks: number
}

export default function SuccessPage() {
  const [savedPlaylists, setSavedPlaylists] = useState<CreatedPlaylist[]>([])
  const [results, setResults] = useState<Record<string, TrackItem[]>>({})
  const router = useRouter()

  useEffect(() => {
    const resultsData = localStorage.getItem("classification_results")
    const playlistsData = localStorage.getItem("saved_playlists")

    if (!isSpotifySessionValid()) {
      clearSpotifySession()
      router.push("/login")
      return
    }

    if (!resultsData) {
      router.push("/")
      return
    }

    const parsed = JSON.parse(resultsData) as ClassificationResult & Record<string, TrackItem[]>
    const grouped = parsed.grouped_tracks || {}
    setResults(Object.keys(grouped).length > 0 ? grouped : parsed)

    if (playlistsData) {
      const parsedPlaylists = JSON.parse(playlistsData)
      if (Array.isArray(parsedPlaylists)) {
        setSavedPlaylists(parsedPlaylists as CreatedPlaylist[])
      } else if (parsedPlaylists && typeof parsedPlaylists === "object") {
        const converted = Object.entries(parsedPlaylists).map(([emotion, playlist_name]) => ({
          emotion,
          playlist_id: "",
          playlist_name: String(playlist_name),
          playlist_url: "",
          added_tracks: 0,
        }))
        setSavedPlaylists(converted)
      }
    }
  }, [router])

  const handleStartOver = () => {
    localStorage.removeItem("playlist_url")
    localStorage.removeItem("emotions")
    localStorage.removeItem("classification_results")
    localStorage.removeItem("saved_playlists")
    localStorage.removeItem("save_skipped")
    localStorage.removeItem("example_batch")
    localStorage.removeItem("total_songs")
    router.push("/")
  }

  const handleOpenSpotify = () => {
    const url = savedPlaylists[0]?.playlist_url || "https://open.spotify.com/collection/playlists"
    window.open(url, "_blank")
  }

  const totalSongs = useMemo(() => Object.values(results).reduce((acc, songs) => acc + songs.length, 0), [results])

  const playlistByEmotion = (emotion: string) => savedPlaylists.find((playlist) => playlist.emotion === emotion)

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#1DB954] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 text-[#1DB954] opacity-30 animate-bounce">
          <CheckCircle className="h-8 w-8" />
        </div>
        <div className="absolute top-1/3 right-1/4 text-purple-400 opacity-30 animate-bounce delay-500">
          <Music className="h-6 w-6" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 text-blue-400 opacity-30 animate-bounce delay-1000">
          <Sparkles className="h-7 w-7" />
        </div>
        <div className="absolute top-1/2 right-1/3 text-[#1DB954] opacity-30 animate-bounce delay-1500">
          <ExternalLink className="h-5 w-5" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-6xl">
          <div className="text-center space-y-8 mb-16">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-[#1DB954]/20 border border-[#1DB954]/30 rounded-full text-[#1DB954] text-sm font-medium">
                <CheckCircle className="mr-2 h-4 w-4" />
                Başarıyla Tamamlandı
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight">
                İyi <span className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] bg-clip-text text-transparent">Dinlemeler!</span>
              </h1>
              <p className="text-xl text-[#b3b3b3] max-w-3xl mx-auto">
                {savedPlaylists.length > 0
                  ? `${savedPlaylists.length} yeni playlist Spotify hesabına kaydedildi. Toplam ${totalSongs} şarkı sınıflandırıldı.`
                  : `${totalSongs} şarkın ${Object.keys(results).length} kategoriye başarıyla ayrıldı.`}
              </p>
            </div>
          </div>

          <div className="flex justify-center mb-16">
            <Card className="w-full max-w-2xl bg-[#121212]/80 backdrop-blur-sm border-[#282828] shadow-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-8 w-8 text-black" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white">Sınıflandırma Özeti</CardTitle>
                <CardDescription className="text-[#b3b3b3]">Oluşturulan playlist'lerinin özeti</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {Object.entries(results).map(([emotion, songs]) => {
                    const created = playlistByEmotion(emotion)
                    return (
                      <div key={emotion} className="flex items-center justify-between p-4 bg-[#282828] rounded-lg hover:bg-[#404040] transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-lg flex items-center justify-center">
                            <Music className="h-6 w-6 text-black" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold capitalize">{created?.playlist_name || `${emotion} şarkılar`}</h3>
                            <p className="text-[#b3b3b3] text-sm">
                              {songs.length} şarkı • {emotion} kategorisi
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#1DB954] text-black px-3 py-1 font-medium">
                            {totalSongs ? Math.round((songs.length / totalSongs) * 100) : 0}%
                          </Badge>
                          {created?.playlist_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-[#1DB954]"
                              onClick={() => window.open(created.playlist_url, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-4 pt-4">
                  {savedPlaylists.length > 0 && (
                    <Button
                      onClick={handleOpenSpotify}
                      className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 text-lg rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      <ExternalLink className="mr-3 h-5 w-5" />
                      Spotify'da Playlist'leri Gör
                    </Button>
                  )}

                  <Button
                    onClick={handleStartOver}
                    className="w-full bg-transparent border-[#404040] text-[#b3b3b3] hover:bg-[#282828] hover:text-white hover:border-[#1DB954] py-4 text-lg rounded-full transition-all duration-200"
                  >
                    <Home className="mr-3 h-5 w-5" />
                    Yeni Playlist Sınıflandır
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-16">
            <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
              <CheckCircle className="h-8 w-8 text-[#1DB954]" />
              <span className="text-sm">Başarıyla Tamamlandı</span>
            </div>
            <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
              <Music className="h-8 w-8 text-[#1DB954]" />
              <span className="text-sm">Yeni Playlist'ler</span>
            </div>
            <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
              <Sparkles className="h-8 w-8 text-[#1DB954]" />
              <span className="text-sm">AI Sınıflandırma</span>
            </div>
            <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
              <ExternalLink className="h-8 w-8 text-[#1DB954]" />
              <span className="text-sm">Spotify Entegrasyonu</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[#181818]/60 backdrop-blur-sm border-[#282828] hover:bg-[#282828]/60 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-[#1DB954] mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Başarılı Analiz</h3>
                <p className="text-[#b3b3b3] text-sm">
                  {totalSongs} şarkın {Object.keys(results).length} kategoriye başarıyla sınıflandırıldı.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#181818]/60 backdrop-blur-sm border-[#282828] hover:bg-[#282828]/60 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-[#1DB954] mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Teşekkürler!</h3>
                <p className="text-[#b3b3b3] text-sm">Playlist Classifier'ı kullandığın için teşekkürler. Müzik keşfetmeye devam 🎵</p>
              </CardContent>
            </Card>

            <Card className="bg-[#181818]/60 backdrop-blur-sm border-[#282828] hover:bg-[#282828]/60 transition-all duration-300">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 text-[#1DB954] mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">Yeni Keşifler</h3>
                <p className="text-[#b3b3b3] text-sm">Artık duygu durumuna göre organize edilmiş playlist'lerle devam edebilirsin.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
