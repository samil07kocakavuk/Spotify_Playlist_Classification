export const SPOTIFY_TOKEN_KEY = "spotify_token"
export const SPOTIFY_TOKEN_EXPIRES_AT_KEY = "spotify_token_expires_at"
export const SPOTIFY_REFRESH_TOKEN_KEY = "spotify_refresh_token"

export function getSpotifyToken(): string {
  return localStorage.getItem(SPOTIFY_TOKEN_KEY) || ""
}

export function getSpotifyTokenExpiresAt(): number | null {
  const raw = localStorage.getItem(SPOTIFY_TOKEN_EXPIRES_AT_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export function isSpotifyTokenExpired(): boolean {
  const expiresAt = getSpotifyTokenExpiresAt()
  if (!expiresAt) {
    // expires_at yoksa güvenli tarafta kalıp yeniden auth isteriz.
    return true
  }
  return Date.now() >= expiresAt
}

export function isSpotifySessionValid(): boolean {
  const token = getSpotifyToken()
  if (!token) return false
  return !isSpotifyTokenExpired()
}

export function saveSpotifySession(accessToken: string, expiresInSeconds?: number, refreshToken?: string): void {
  localStorage.setItem(SPOTIFY_TOKEN_KEY, accessToken)

  if (typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)) {
    // 30sn erken expire kabul ederek güvenli tampon bırakıyoruz.
    const expiresAt = Date.now() + Math.max(0, expiresInSeconds - 30) * 1000
    localStorage.setItem(SPOTIFY_TOKEN_EXPIRES_AT_KEY, String(expiresAt))
  }

  if (refreshToken) {
    localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearSpotifySession(): void {
  localStorage.removeItem(SPOTIFY_TOKEN_KEY)
  localStorage.removeItem(SPOTIFY_TOKEN_EXPIRES_AT_KEY)
  localStorage.removeItem(SPOTIFY_REFRESH_TOKEN_KEY)
}

export function isAuthExpiredError(detail: unknown): boolean {
  const text =
    typeof detail === "string"
      ? detail
      : typeof detail === "object" && detail !== null
        ? JSON.stringify(detail)
        : ""

  const lowered = text.toLowerCase()
  return (
    lowered.includes("access token") && lowered.includes("expired") ||
    lowered.includes("invalid access token") ||
    lowered.includes("authentication token") ||
    lowered.includes("status\":401") ||
    lowered.includes("spotify api hatası (401)")
  )
}
