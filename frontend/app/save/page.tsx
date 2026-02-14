"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Save, Music, ArrowRight, Sparkles, TrendingUp, Users, Clock } from "lucide-react"
import { clearSpotifySession, getSpotifyToken, isAuthExpiredError, isSpotifySessionValid } from "@/lib/auth"
import { browserError, browserLog, getApiBaseUrl } from "@/lib/runtime-config"

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

export default function SavePage() {
  const [results, setResults] = useState<Record<string, TrackItem[]>>({})
  const [playlistNames, setPlaylistNames] = useState<Record<string, string>>({})
  const [wantToSave, setWantToSave] = useState<boolean | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const resultsData = localStorage.getItem("classification_results")

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
    const normalizedResults = Object.keys(grouped).length > 0 ? grouped : parsed

    setResults(normalizedResults)

    const initialNames: Record<string, string> = {}
    Object.keys(normalizedResults).forEach((emotion) => {
      initialNames[emotion] = `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} Şarkılar`
    })
    setPlaylistNames(initialNames)
  }, [router])

  const totalSongs = useMemo(() => Object.values(results).reduce((acc, songs) => acc + songs.length, 0), [results])

  const handleSave = async () => {
    if (!isSpotifySessionValid()) {
      clearSpotifySession()
      router.push("/login")
      return
    }

    const token = getSpotifyToken()
    if (!token) {
      clearSpotifySession()
      router.push("/login")
      return
    }

    setIsSaving(true)
    setError("")

    const apiBaseUrl = getApiBaseUrl()

    try {
      browserLog("save", "save_playlists isteği gönderiliyor", {
        apiBaseUrl,
        categories: Object.keys(results).length,
        totalSongs,
      })

      const response = await fetch(`${apiBaseUrl}/save_playlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: token,
          grouped_tracks: results,
          playlist_names: playlistNames,
          public: false,
        }),
      })

      const data = await response.json()
      browserLog("save", "save_playlists cevabı alındı", { status: response.status, ok: response.ok, data })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || isAuthExpiredError(data?.detail || data)) {
          clearSpotifySession()
          router.push("/login")
          return
        }
        throw new Error(data?.detail || "Playlist kaydetme başarısız")
      }

      localStorage.setItem("saved_playlists", JSON.stringify((data.created_playlists || []) as CreatedPlaylist[]))
      localStorage.setItem("save_skipped", JSON.stringify(data.skipped || []))
      router.push("/success")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu"
      setError(message)
      browserError("save", "Playlist kaydetme hatası", { message, error: err })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = () => {
    localStorage.removeItem("saved_playlists")
    localStorage.removeItem("save_skipped")
    router.push("/success")
  }

  if (wantToSave === null) {
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
            <Save className="h-6 w-6" />
          </div>
          <div className="absolute bottom-1/4 left-1/3 text-blue-400 opacity-30 animate-bounce delay-1000">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="absolute top-1/2 right-1/3 text-[#1DB954] opacity-30 animate-bounce delay-1500">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-6xl">
            <div className="text-center space-y-8 mb-16">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-medium">
                  <Save className="mr-2 h-4 w-4" />
                  Adım 4/4 - Sonuçlar
                </div>
                <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight">
                  Analiz <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">Tamamlandı!</span>
                </h1>
                <p className="text-xl text-[#b3b3b3] max-w-3xl mx-auto">
                  {totalSongs} şarkın {Object.keys(results).length} farklı duygu kategorisine ayrıldı. Bu playlist'leri Spotify hesabına kaydetmek ister misin?
                </p>
              </div>
            </div>

            <div className="flex justify-center mb-16">
              <Card className="w-full max-w-2xl bg-[#121212]/80 backdrop-blur-sm border-[#282828] shadow-2xl">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <Music className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Sınıflandırma Sonuçları</CardTitle>
                  <CardDescription className="text-[#b3b3b3]">İşte playlist'inin duygu durumlarına göre dağılımı</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {Object.entries(results).map(([emotion, songs]) => (
                      <div key={emotion} className="flex items-center justify-between p-4 bg-[#282828] rounded-lg hover:bg-[#404040] transition-colors">
                        <div className="flex items-center space-x-4">
                          <Badge className="capitalize bg-[#1DB954] text-black font-medium px-3 py-1 rounded-full">{emotion}</Badge>
                          <span className="text-[#b3b3b3]">{songs.length} şarkı</span>
                        </div>
                        <div className="text-green-400 font-medium">{totalSongs ? Math.round((songs.length / totalSongs) * 100) : 0}%</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={() => setWantToSave(true)}
                      className="flex-1 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 rounded-full transition-all duration-200 transform hover:scale-105"
                    >
                      <Save className="mr-2 h-5 w-5" />
                      Evet, Kaydet
                    </Button>
                    <Button
                      onClick={() => setWantToSave(false)}
                      className="flex-1 bg-transparent border-[#404040] text-[#b3b3b3] hover:bg-[#282828] hover:text-white hover:border-[#1DB954] py-3 rounded-full transition-all duration-200"
                    >
                      Sadece Sonuçları Gör
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-16">
              <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
                <Save className="h-8 w-8 text-green-400" />
                <span className="text-sm">Spotify'a Kaydet</span>
              </div>
              <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
                <Music className="h-8 w-8 text-green-400" />
                <span className="text-sm">Yeni Playlist'ler</span>
              </div>
              <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
                <Sparkles className="h-8 w-8 text-green-400" />
                <span className="text-sm">Özel İsimler</span>
              </div>
              <div className="flex flex-col items-center space-y-3 text-[#b3b3b3]">
                <ArrowRight className="h-8 w-8 text-green-400" />
                <span className="text-sm">Anında Erişim</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-[#181818]/60 backdrop-blur-sm border-[#282828] hover:bg-[#282828]/60 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">Başarılı Analiz</h3>
                  <p className="text-[#b3b3b3] text-sm">
                    Playlist'in başarıyla {Object.keys(results).length} kategoriye ayrıldı. Her kategori için ayrı playlist oluşturulacak.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#181818]/60 backdrop-blur-sm border-[#282828] hover:bg-[#282828]/60 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">Spotify Entegrasyonu</h3>
                  <p className="text-[#b3b3b3] text-sm">
                    Yeni playlist'ler doğrudan Spotify hesabına kaydedilecek ve anında dinlemeye başlayabileceksin.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#181818]/60 backdrop-blur-sm border-[#282828] hover:bg-[#282828]/60 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">Hızlı Kaydetme</h3>
                  <p className="text-[#b3b3b3] text-sm">Playlist'ler birkaç saniye içinde oluşturulacak ve kütüphanende görünecek.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!wantToSave) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#191414] to-black p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-[#121212] border-[#282828] shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-white mb-2">Sınıflandırma Sonuçları</CardTitle>
              <CardDescription className="text-[#b3b3b3] text-base">İşte playlist'inin duygu durumlarına göre dağılımı</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(results).map(([emotion, songs]) => (
                <div key={emotion} className="p-4 border border-[#282828] rounded-lg bg-[#282828] hover:bg-[#404040] transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="capitalize bg-[#1DB954] text-black font-medium px-3 py-1 rounded-full">{emotion}</Badge>
                    <span className="text-[#b3b3b3]">{songs.length} şarkı</span>
                  </div>
                  <div className="text-sm text-[#b3b3b3]">
                    {songs.slice(0, 3).map((song) => `${song.name} - ${song.artist}`).join(", ")}
                    {songs.length > 3 && ` ve ${songs.length - 3} şarkı daha...`}
                  </div>
                </div>
              ))}

              <Button
                onClick={handleSkip}
                className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 text-lg rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                Tamamla
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#191414] to-black p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-[#121212] border-[#282828] shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white mb-2">Playlist İsimlerini Belirle</CardTitle>
            <CardDescription className="text-[#b3b3b3] text-base">
              Her duygu durumu için oluşturulacak playlist'lerin isimlerini yaz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(results).map(([emotion, songs]) => (
              <div key={emotion} className="space-y-2">
                <Label htmlFor={`playlist-${emotion}`} className="flex items-center justify-between text-white font-medium">
                  <span className="capitalize">{emotion}</span>
                  <Badge className="text-xs bg-[#282828] text-[#b3b3b3] border-[#404040] px-2 py-1 rounded-full">
                    {songs.length} şarkı
                  </Badge>
                </Label>
                <Input
                  id={`playlist-${emotion}`}
                  value={playlistNames[emotion] || ""}
                  onChange={(e) =>
                    setPlaylistNames((prev) => ({
                      ...prev,
                      [emotion]: e.target.value,
                    }))
                  }
                  placeholder={`${emotion} playlist ismi...`}
                  className="bg-[#282828] border-[#404040] text-white placeholder:text-[#b3b3b3] focus:border-[#1DB954] focus:ring-[#1DB954] rounded-lg"
                />
              </div>
            ))}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || Object.values(playlistNames).some((name) => !name.trim())}
                className="flex-1 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 rounded-full transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Playlist'leri Oluştur
                  </>
                )}
              </Button>
              <Button
                onClick={handleSkip}
                disabled={isSaving}
                className="bg-transparent border-[#404040] text-[#b3b3b3] hover:bg-[#282828] hover:text-white hover:border-[#1DB954] py-3 px-6 rounded-full transition-all duration-200"
              >
                Atla
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
