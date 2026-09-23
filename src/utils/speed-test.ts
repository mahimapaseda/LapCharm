export interface SpeedTestResult {
  downloadMbps: number
  uploadMbps: number
  latencyMs: number
  server: string
}

const CF_DOWN = 'https://speed.cloudflare.com/__down'
const CF_UP = 'https://speed.cloudflare.com/__up'
const DOWNLOAD_BYTES = 8_000_000 // 8 MB
const UPLOAD_BYTES = 2_000_000 // 2 MB

function mbps(bytes: number, ms: number): number {
  if (ms <= 0) return 0
  return Math.round(((bytes * 8) / (ms / 1000) / 1_000_000) * 10) / 10
}

async function measureLatency(): Promise<number> {
  const samples: number[] = []
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now()
    await fetch(`${CF_DOWN}?bytes=0&r=${Date.now()}`, { cache: 'no-store' })
    samples.push(performance.now() - t0)
  }
  samples.sort((a, b) => a - b)
  return Math.round(samples[0])
}

async function measureDownload(): Promise<number> {
  const url = `${CF_DOWN}?bytes=${DOWNLOAD_BYTES}&r=${Date.now()}`
  const t0 = performance.now()
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Download test failed (${res.status})`)
  const buf = await res.arrayBuffer()
  const elapsed = performance.now() - t0
  return mbps(buf.byteLength, elapsed)
}

async function measureUpload(): Promise<number> {
  const payload = new Uint8Array(UPLOAD_BYTES)
  crypto.getRandomValues(payload.subarray(0, Math.min(65536, UPLOAD_BYTES)))
  const t0 = performance.now()
  const res = await fetch(`${CF_UP}?r=${Date.now()}`, {
    method: 'POST',
    body: payload,
    cache: 'no-store'
  })
  if (!res.ok && res.status !== 200) {
    // Cloudflare may return 200 empty; treat network errors only
    throw new Error(`Upload test failed (${res.status})`)
  }
  await res.arrayBuffer().catch(() => undefined)
  const elapsed = performance.now() - t0
  return mbps(UPLOAD_BYTES, elapsed)
}

/** Run a Cloudflare-backed download / upload / latency speed test in the renderer. */
export async function runSpeedTest(): Promise<SpeedTestResult> {
  const latencyMs = await measureLatency()
  const downloadMbps = await measureDownload()
  const uploadMbps = await measureUpload()
  return {
    downloadMbps,
    uploadMbps,
    latencyMs,
    server: 'Cloudflare'
  }
}
