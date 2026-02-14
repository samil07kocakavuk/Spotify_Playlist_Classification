"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, Brain, Sparkles } from "lucide-react"
import { clearSpotifySession, isSpotifySessionValid } from "@/lib/auth"
import { browserError, browserLog, getApiBaseUrl } from "@/lib/runtime-config"

type TrackItem = {
  id?: string | null
  name?: string
  artist?: string
  url?: string
}

type EmotionStatsMap = Record<string, { count: number; percentage: number }>

type ClientEvent = {
  ts: string
  event: string
  message: string
  batch?: number
  total_batches?: number
  status?: string
  duration_sec?: number
  song_count?: number
  reason?: string
}

type BatchLog = {
  batch: number
  total_batches: number
  status: "ok" | "fallback"
  duration_sec: number
  song_count: number
  provider: string
  mode: string
  attempt: number
  unique_labels: string[]
  reason?: string
}

type ClassificationResult = {
  playlist_id: string
  total_songs: number
  total_batches: number
  emotion_stats: EmotionStatsMap
  grouped_tracks: Record<string, TrackItem[]>
  failed_batches?: Array<{ batch: number; reason: string }>
  batch_logs?: BatchLog[]
  client_events?: ClientEvent[]
}

type EmotionStat = {
  emotion: string
  count: number
  percent: number
}

function statsToArray(stats: EmotionStatsMap): EmotionStat[] {
  return Object.entries(stats).map(([emotion, value]) => ({
    emotion,
    count: value.count,
    percent: Math.round(value.percentage),
  }))
}

export default function ClassifyPage() {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("Playlist analiz ediliyor...")
  const [isComplete, setIsComplete] = useState(false)
  const [songsProcessed, setSongsProcessed] = useState(0)
  const [totalSongs, setTotalSongs] = useState(0)
  const [currentSong, setCurrentSong] = useState("AI başlatılıyor...")
  const [error, setError] = useState<string | null>(null)
  const [emotionStats, setEmotionStats] = useState<EmotionStat[]>([])
  const [failedCount, setFailedCount] = useState(0)

  const router = useRouter()

  const steps = useMemo(
    () => [
      "Spotify'dan playlist verisi alınıyor...",
      "Şarkılar gruplanıyor...",
      "AI ile duygu sınıflandırması yapılıyor...",
      "Sonuçlar hazırlanıyor...",
      "Tamamlandı!",
    ],
    [],
  )

  useEffect(() => {
    const playlistUrl = localStorage.getItem("playlist_url")
    const emotions: string[] = JSON.parse(localStorage.getItem("emotions") || "[]")
    const storedTotal = parseInt(localStorage.getItem("total_songs") || "0", 10)
    const exampleBatch: string[] = JSON.parse(localStorage.getItem("example_batch") || "[]")
    const apiBaseUrl = getApiBaseUrl()

    browserLog("classify", "Sınıflandırma ekranı açıldı", {
      apiBaseUrl,
      playlistUrl,
      emotions,
      storedTotal,
      exampleBatchSize: exampleBatch.length,
      userAgent: navigator.userAgent,
    })

    if (!isSpotifySessionValid()) {
      browserLog("classify", "Spotify oturumu geçersiz, login ekranına dönülüyor")
      clearSpotifySession()
      router.push("/login")
      return
    }

    if (!playlistUrl || emotions.length === 0) {
      browserLog("classify", "playlist_url veya emotions eksik, emotions ekranına dönülüyor")
      router.push("/emotions")
      return
    }

    setTotalSongs(storedTotal)

    let cancelled = false
    let stepIndex = 0

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 3, 90)
        if (storedTotal > 0) {
          setSongsProcessed(Math.min(storedTotal, Math.round((next / 100) * storedTotal)))
        }

        const suggestedStep = Math.min(steps.length - 2, Math.floor((next / 90) * (steps.length - 1)))
        if (suggestedStep !== stepIndex) {
          stepIndex = suggestedStep
          setCurrentStep(steps[stepIndex])
          browserLog("classify", "UI adımı değişti", { step: stepIndex + 1, label: steps[stepIndex], progress: next })
        }

        if (next === 90 && prev < 90) {
          setCurrentStep("AI batch sonuçları bekleniyor...")
          browserLog("classify", "İlerleme %90: backend batch sonuçları bekleniyor")
        }

        return next
      })
    }, 700)

    let songIndex = 0
    const songInterval = setInterval(() => {
      if (exampleBatch.length > 0) {
        const song = exampleBatch[songIndex % exampleBatch.length]
        setCurrentSong(song)
        browserLog("classify", "Örnek şarkı gösteriliyor", { song, index: songIndex })
        songIndex += 1
      }
    }, 1800)

    const runClassification = async () => {
      const startedAt = performance.now()

      try {
        browserLog("classify", "classify isteği gönderiliyor", {
          endpoint: `${apiBaseUrl}/classify`,
          playlist_url: playlistUrl,
          emotions,
        })

        const response = await fetch(`${apiBaseUrl}/classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlist_url: playlistUrl, emotions }),
        })

        const result: ClassificationResult = await response.json()
        browserLog("classify", "classify cevabı alındı", {
          status: response.status,
          ok: response.ok,
          elapsedMs: Math.round(performance.now() - startedAt),
        })

        if (!response.ok) {
          throw new Error((result as unknown as { detail?: string }).detail || "Sınıflandırma başarısız")
        }

        if (cancelled) return

        if (Array.isArray(result.client_events)) {
          result.client_events.forEach((event) => {
            browserLog("classify:backend", event.message || event.event, event)
          })
        }

        if (Array.isArray(result.batch_logs)) {
          result.batch_logs.forEach((batchLog) => {
            browserLog("classify:batch", `Batch ${batchLog.batch}/${batchLog.total_batches} ${batchLog.status}`, batchLog)
          })
        }

        localStorage.setItem("classification_results", JSON.stringify(result))
        setEmotionStats(statsToArray(result.emotion_stats || {}))
        setTotalSongs(result.total_songs || storedTotal)
        setSongsProcessed(result.total_songs || storedTotal)
        setFailedCount((result.failed_batches || []).length)

        setProgress(100)
        setCurrentStep("Tamamlandı!")
        setIsComplete(true)

        browserLog("classify", "Sınıflandırma tamamlandı, save ekranına yönlendiriliyor", {
          totalSongs: result.total_songs,
          totalBatches: result.total_batches,
          failedBatches: (result.failed_batches || []).length,
        })

        setTimeout(() => {
          router.push("/save")
        }, 1500)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : "Bir hata oluştu"
        setError(message)
        setCurrentStep("Bir hata oluştu")
        browserError("classify", "Sınıflandırma hatası", { message, error: err })
      } finally {
        clearInterval(progressInterval)
      }
    }

    runClassification()

    return () => {
      cancelled = true
      browserLog("classify", "Sınıflandırma ekranı temizleniyor (unmount)")
      clearInterval(progressInterval)
      clearInterval(songInterval)
    }
  }, [router, steps])

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-6xl">
          <div className="text-center space-y-8 mb-16">
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium">
                <Brain className="mr-2 h-4 w-4" />
                Adım 3/4 - AI Analizi
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight">
                {isComplete ? (
                  <>
                    Analiz <span className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] bg-clip-text text-transparent">Tamamlandı!</span>
                  </>
                ) : (
                  <>
                    AI <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Çalışıyor</span>
                  </>
                )}
              </h1>
            </div>
          </div>

          <div className="flex justify-center mb-16">
            <Card className="w-full max-w-2xl bg-[#121212]/80 backdrop-blur-sm border-[#282828] shadow-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  {isComplete ? (
                    <div className="w-16 h-16 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center shadow-lg">
                      <Sparkles className="h-8 w-8 text-black" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-2xl font-bold text-white">Analiz Durumu</CardTitle>
                <CardDescription className="text-[#b3b3b3]">AI modelimiz şarkılarınızı analiz ediyor</CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-[#b3b3b3]">{error || currentStep}</span>
                    <span className="font-bold text-[#1DB954]">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-[#404040] rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="bg-[#282828] p-6 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-lg flex items-center justify-center">
                      <Music className="h-6 w-6 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">Şu an analiz ediliyor:</div>
                      <div className="text-[#1DB954] text-sm">{currentSong}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#282828] p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-[#1DB954] mb-1">{songsProcessed}</div>
                    <div className="text-[#b3b3b3] text-sm">İşlenen</div>
                  </div>
                  <div className="bg-[#282828] p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-white mb-1">{totalSongs}</div>
                    <div className="text-[#b3b3b3] text-sm">Toplam</div>
                  </div>
                  <div className="bg-[#282828] p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">{Math.round(progress)}%</div>
                    <div className="text-[#b3b3b3] text-sm">Tamamlandı</div>
                  </div>
                </div>

                {emotionStats.length > 0 && (
                  <div className="space-y-2">
                    {emotionStats.map((item) => (
                      <div key={item.emotion} className="flex justify-between text-sm text-[#b3b3b3]">
                        <span className="capitalize">{item.emotion}</span>
                        <span>
                          {item.count} şarkı ({item.percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {failedCount > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm rounded-lg p-3">
                    {failedCount} batch yanıtı beklenen formatta gelmediği için güvenli fallback uygulandı. Detaylar backend logunda ve
                    <span className="font-semibold"> datas/batch_logs.json</span> dosyasında.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
