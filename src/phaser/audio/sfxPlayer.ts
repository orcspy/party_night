import footstepUrl from '../../assets/sfx/footstep.wav'
import hitUrl from '../../assets/sfx/hit.wav'

export type SfxId = 'footstep' | 'hit'

const SFX_URLS: Record<SfxId, string> = {
  footstep: footstepUrl,
  hit: hitUrl,
}

const SFX_GAIN: Record<SfxId, number> = {
  footstep: 0.32,
  hit: 0.42,
}

let audioContext: AudioContext | null = null
let unlockInstalled = false
const audioData = new Map<SfxId, Promise<ArrayBuffer>>()
const buffers = new Map<SfxId, Promise<AudioBuffer | null>>()

function audioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const browserWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext }
  return window.AudioContext ?? browserWindow.webkitAudioContext ?? null
}

function ensureContext(): AudioContext | null {
  if (audioContext && audioContext.state !== 'closed') return audioContext
  const AudioContextCtor = audioContextConstructor()
  if (!AudioContextCtor) return null
  audioContext = new AudioContextCtor()
  return audioContext
}

function fetchAudioData(id: SfxId): Promise<ArrayBuffer> {
  const cached = audioData.get(id)
  if (cached) return cached
  const request = fetch(SFX_URLS[id]).then((response) => {
    if (!response.ok) throw new Error(`SFX load failed: ${id} (${response.status})`)
    return response.arrayBuffer()
  })
  audioData.set(id, request)
  return request
}

async function decodeBuffer(id: SfxId): Promise<AudioBuffer | null> {
  const context = ensureContext()
  if (!context) return null
  const existing = buffers.get(id)
  if (existing) return existing
  const promise = fetchAudioData(id)
    .then((data) => context.decodeAudioData(data.slice(0)))
    .catch((error) => {
      console.warn(`[SFX] ${id} decode failed`, error)
      return null
    })
  buffers.set(id, promise)
  return promise
}

async function resumeContext(): Promise<AudioContext | null> {
  const context = ensureContext()
  if (!context) return null
  if (context.state === 'suspended') {
    try {
      await context.resume()
    } catch (error) {
      console.warn('[SFX] audio context unlock failed', error)
    }
  }
  return context.state === 'running' ? context : null
}

/**
 * Install a capture-phase global unlock so the shared AudioContext is resumed before
 * Phaser canvas handlers or React click handlers dispatch the command that may emit SFX.
 * The context intentionally survives Phaser.Game destruction/recreation across screens.
 */
export function installSfxUnlock(): void {
  if (typeof window === 'undefined' || unlockInstalled) return
  unlockInstalled = true

  // Start the tiny WAV requests immediately; decoding waits for a context.
  void fetchAudioData('footstep').catch(() => undefined)
  void fetchAudioData('hit').catch(() => undefined)

  const unlock = () => {
    void resumeContext().then(() => {
      void decodeBuffer('footstep')
      void decodeBuffer('hit')
    })
  }

  window.addEventListener('pointerdown', unlock, { capture: true, passive: true })
  window.addEventListener('touchend', unlock, { capture: true, passive: true })
  window.addEventListener('keydown', unlock, { capture: true })
}

export function playSfx(id: SfxId): void {
  void (async () => {
    const context = await resumeContext()
    if (!context) return
    const buffer = await decodeBuffer(id)
    if (!buffer || context.state !== 'running') return

    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.value = SFX_GAIN[id]
    source.connect(gain)
    gain.connect(context.destination)
    source.start()
  })()
}
