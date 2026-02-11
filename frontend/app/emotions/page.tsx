"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Heart, Smile, Frown, Zap, Moon, Sun, Sparkles } from "lucide-react"
import { clearSpotifySession, isSpotifySessionValid } from "@/lib/auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

const suggestedEmotions = [
  { name: "mutlu", icon: Smile, color: "from-yellow-400 to-orange-500", description: "Neşeli ve pozitif şarkılar" },
  { name: "üzgün", icon: Frown, color: "from-blue-400 to-blue-600", description: "Melankolik ve duygusal parçalar" },
  { name: "enerjik", icon: Zap, color: "from-red-400 to-pink-500", description: "Yüksek tempolu ve dinamik müzikler" },
  { name: "sakin", icon: Moon, color: "from-purple-400 to-indigo-500", description: "Rahatlatıcı ve huzur verici" },
  { name: "romantik", icon: Heart, color: "from-pink-400 to-rose-500", description: "Aşk ve sevgi dolu şarkılar" },
  { name: "neşeli", icon: Sun, color: "from-green-400 to-emerald-500", description: "Keyifli ve eğlenceli müzikler" },
]

export default function EmotionsPage() {
  const [emotions, setEmotions] = useState<string[]>([])
  const [newEmotion, setNewEmotion] = useState("")
  const router = useRouter()

  useEffect(() => {
    const playlistUrl = localStorage.getItem("playlist_url")

    if (!isSpotifySessionValid()) {
      clearSpotifySession()
      router.push("/login")
      return
    }

    if (!playlistUrl) {
      router.push("/")
    }
  }, [router])

  const addEmotion = (emotion: string) => {
    if (emotion.trim() && !emotions.includes(emotion.toLowerCase().trim())) {
      setEmotions([...emotions, emotion.toLowerCase().trim()])
      setNewEmotion("")
    }
  }

  const removeEmotion = (emotion: string) => {
    setEmotions(emotions.filter((e) => e !== emotion))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const playlistUrl = localStorage.getItem("playlist_url")
    const normalizedEmotions = emotions.map((emotion) => emotion.trim().toLowerCase())

    if (!playlistUrl || normalizedEmotions.length === 0) {
      return
    }

    localStorage.setItem("emotions", JSON.stringify(normalizedEmotions))

    try {
      const response = await fetch(`${API_BASE_URL}/playlist_info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playlist_url: playlistUrl }),
      })

      if (!response.ok) {
        throw new Error("Playlist bilgisi alınamadı")
      }

      const result = await response.json()
      localStorage.setItem("total_songs", String(result.total_songs || 0))

      const songNames = (result.example_batch || []).map(
        (track: { name?: string; artist?: string }) => `${track.name || ""} - ${track.artist || ""}`,
      )
      localStorage.setItem("example_batch", JSON.stringify(songNames))

      router.push("/classify")
    } catch (error) {
      console.error("❌ Backend'e istek gönderilemedi:", error)
    }
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
          <Heart className="h-8 w-8" />
        </div>
        <div className="absolute top-1/3 right-1/4 text-purple-400 opacity-30 animate-bounce delay-500">
          <Smile className="h-6 w-6" />
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
              <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm font-medium">
                <Heart className="mr-2 h-4 w-4" />
                Adım 2/4 - Duygu Seçimi
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight">
                Hangi{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  Duygular
                </span>
                ?
              </h1>
              <p className="text-xl text-[#b3b3b3] max-w-3xl mx-auto">
                Playlist'inizin hangi duygu durumlarına göre sınıflandırılmasını istiyorsunuz? AI'mız seçtiğiniz kategorilere göre şarkılarınızı analiz edecek.
              </p>
            </div>
          </div>

          <div className="flex justify-center mb-16">
            <Card className="w-full max-w-2xl bg-[#121212]/80 backdrop-blur-sm border-[#282828] shadow-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <Heart className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white">Duygu Kategorileri</CardTitle>
                <CardDescription className="text-[#b3b3b3]">
                  Aşağıdaki kategorilerden seçim yapın veya kendi duygularınızı ekleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <Label className="text-white font-medium mb-4 block text-lg">Önerilen Duygular</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {suggestedEmotions.map((emotion) => {
                      const Icon = emotion.icon
                      const isSelected = emotions.includes(emotion.name)
                      return (
                        <Button
                          key={emotion.name}
                          onClick={() => (isSelected ? removeEmotion(emotion.name) : addEmotion(emotion.name))}
                          className={`h-auto p-4 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                            isSelected
                              ? `bg-gradient-to-r ${emotion.color} text-white shadow-lg border-2 border-white/20`
                              : "bg-[#181818] hover:bg-[#282828] text-[#b3b3b3] hover:text-white border-2 border-[#404040] hover:border-[#1DB954]"
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-3 w-full">
                            <Icon className="h-8 w-8" />
                            <div className="text-center font-bold capitalize text-base">{emotion.name}</div>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="custom-emotion" className="text-white font-medium mb-4 block text-lg">
                    Özel Duygu Ekle
                  </Label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      addEmotion(newEmotion)
                    }}
                    className="flex gap-3"
                  >
                    <Input
                      id="custom-emotion"
                      placeholder="Örn: melankolik, heyecanlı, nostaljik..."
                      value={newEmotion}
                      onChange={(e) => setNewEmotion(e.target.value)}
                      className="bg-[#282828] border-[#404040] text-white placeholder:text-[#b3b3b3] focus:border-[#1DB954] focus:ring-[#1DB954] rounded-full h-12"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full w-12 h-12 flex-shrink-0"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </form>
                </div>

                {emotions.length > 0 && (
                  <div>
                    <Label className="text-white font-medium mb-4 block text-lg">
                      Seçilen Duygular ({emotions.length})
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {emotions.map((emotion) => (
                        <Badge
                          key={emotion}
                          className="bg-[#1DB954] text-black px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 hover:bg-[#1ed760] transition-colors"
                        >
                          <span className="capitalize">{emotion}</span>
                          <Button
                            onClick={() => removeEmotion(emotion)}
                            className="bg-transparent hover:bg-black/20 p-0 h-4 w-4 ml-2"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 text-lg rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:transform-none"
                  disabled={emotions.length === 0}
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Sınıflandırmaya Başla ({emotions.length} duygu)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
