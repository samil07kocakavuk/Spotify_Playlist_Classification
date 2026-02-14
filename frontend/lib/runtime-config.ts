function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "")
}

export function getApiBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim()
  if (configured) {
    return trimTrailingSlashes(configured)
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:8000`
  }

  return "http://127.0.0.1:8000"
}

export function getSpotifyRedirectUri(): string {
  const configured = (process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "").trim()
  if (configured) {
    return configured
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/callback`
  }

  return "http://127.0.0.1:3000/callback"
}

export function browserLog(scope: string, message: string, payload?: unknown): void {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${scope}] ${message}`

  if (typeof payload === "undefined") {
    console.log(prefix)
    return
  }

  console.log(prefix, payload)
}

export function browserError(scope: string, message: string, payload?: unknown): void {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${scope}] ${message}`

  if (typeof payload === "undefined") {
    console.error(prefix)
    return
  }

  console.error(prefix, payload)
}
