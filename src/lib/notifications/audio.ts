/**
 * Audio notification module - plays synthesized doorbell sound.
 *
 * BROWSER SECURITY POLICY:
 * Modern browsers block audio playback until a user gesture (click, tap, keypress)
 * has occurred on the page. This is to prevent annoying autoplay audio.
 * The enableAudio() function must be called from a user-initiated event handler
 * (e.g., button click) to unlock audio playback.
 *
 * Coverage note: This module uses Web Audio API which requires browser context
 * with user gesture to initialize. The playDoorbellSound() function is
 * intentionally not unit tested as it's simple synthesis code with low risk.
 */

// Declare webkit prefixed AudioContext for older Safari
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}
const webkitAudioContext = typeof window !== 'undefined' ? window.webkitAudioContext : undefined

let audioContext: AudioContext | null = null
let audioContextFailed = false
let audioEnabled = false
let audioMuted = true  // Start muted by default

// Check for AudioContext support (including webkit prefix for older Safari)
const AudioContextClass = typeof AudioContext !== 'undefined'
  ? AudioContext
  : typeof webkitAudioContext !== 'undefined'
    ? webkitAudioContext
    : null

function isAudioSupported(): boolean {
  return AudioContextClass !== null
}

async function getAudioContext(): Promise<AudioContext | null> {
  if (!isAudioSupported() || audioContextFailed) {
    return null
  }
  if (!audioContext) {
    try {
      audioContext = new AudioContextClass!()
    } catch (e) {
      // Cache failure to avoid repeated creation attempts
      audioContextFailed = true
      if (import.meta.env.DEV) {
        console.warn('AudioContext creation failed:', e)
      }
      return null
    }
  }
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume()
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('AudioContext resume failed:', e)
      }
    }
  }
  return audioContext
}

/**
 * Check if audio is currently unmuted and ready to play.
 */
export function isAudioUnmuted(): boolean {
  return audioEnabled && !audioMuted
}

/**
 * Enable audio playback. MUST be called from a user gesture (click/tap/keypress)
 * due to browser autoplay policies. Returns true if successfully enabled.
 */
export async function enableAudio(): Promise<boolean> {
  const ctx = await getAudioContext()
  if (ctx && ctx.state === 'running') {
    audioEnabled = true
    if (import.meta.env.DEV) {
      console.log('[Audio] Enabled via user gesture')
    }
    return true
  }
  return false
}

/**
 * Set audio muted state. When muted, playDoorbellSound() will not play.
 */
export function setAudioMuted(muted: boolean): void {
  audioMuted = muted
  if (import.meta.env.DEV) {
    console.log('[Audio] Muted:', muted)
  }
}

/**
 * Create a bell tone with harmonics for a richer sound.
 */
function createBellTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number
): { oscillators: OscillatorNode[], gainNode: GainNode } {
  const gainNode = ctx.createGain()
  gainNode.connect(ctx.destination)

  // Bell-like sound uses multiple harmonics
  const harmonics = [1, 2, 3, 4.2] // Slight detuning on 4th harmonic for bell character
  const harmonicVolumes = [1, 0.5, 0.25, 0.15]

  const oscillators: OscillatorNode[] = []

  harmonics.forEach((harmonic, i) => {
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency * harmonic, startTime)

    // Bell-like envelope: quick attack, long exponential decay, then fade to silence
    const peakTime = startTime + 0.01
    const decayEnd = startTime + duration
    const silenceTime = decayEnd + 0.1 // Extra time to fade to true silence

    oscGain.gain.setValueAtTime(volume * harmonicVolumes[i], startTime)
    oscGain.gain.setValueAtTime(volume * harmonicVolumes[i], peakTime)
    oscGain.gain.exponentialRampToValueAtTime(0.001, decayEnd)
    // Linear ramp to true zero to avoid any click
    oscGain.gain.linearRampToValueAtTime(0, silenceTime)

    osc.connect(oscGain)
    oscGain.connect(gainNode)

    osc.start(startTime)
    osc.stop(silenceTime)

    oscillators.push(osc)
  })

  return { oscillators, gainNode }
}

/**
 * Play doorbell sound. Only plays if audio is enabled and not muted.
 * Creates a classic "DING-DONG" sound ~2.5 seconds long with natural decay.
 */
export async function playDoorbellSound(): Promise<void> {
  if (!audioEnabled || audioMuted) {
    if (import.meta.env.DEV) {
      console.log('[Audio] Skipping sound - audio not enabled or muted')
    }
    return
  }

  try {
    const ctx = await getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // DING - higher note (E5 = 659.25 Hz)
    const ding = createBellTone(ctx, 659.25, now, 1.5, 0.3)

    // DONG - lower note (C5 = 523.25 Hz), starts after short delay
    const dong = createBellTone(ctx, 523.25, now + 0.5, 2.0, 0.3)

    // Clean up when the longest sound finishes
    const lastOsc = dong.oscillators[dong.oscillators.length - 1]
    lastOsc.onended = () => {
      ding.oscillators.forEach(o => o.disconnect())
      dong.oscillators.forEach(o => o.disconnect())
      ding.gainNode.disconnect()
      dong.gainNode.disconnect()
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('Could not play doorbell sound:', e)
    }
  }
}
