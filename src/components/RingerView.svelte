<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { p2pStore, isConnected, doorbellCount, doorbellName as p2pDoorbellName } from '../stores/p2p'
  import { historyStore } from '../stores/history'
  import { getRingerHistory } from '$lib/storage'
  import { isValidToken, deriveTopicId } from '$lib/crypto'
  import { createTimeout } from '$lib/utils'
  import { RING_COOLDOWN_MS } from '$lib/config'
  import ConnectionStatus from './ConnectionStatus.svelte'
  import ConnectionError from './ConnectionError.svelte'

  const timeout = createTimeout()
  const COOLDOWN_SECONDS = RING_COOLDOWN_MS / 1000

  let { params = { token: '' } }: { params: { token: string } } = $props()

  let token = $derived(params.token)
  // Use P2P name, or fall back to history name, or 'Doorbell'
  let historyName = $derived(() => {
    const history = getRingerHistory()
    return history.find(e => e.token === token)?.name
  })
  let doorbellName = $derived($p2pDoorbellName || historyName() || 'Doorbell')
  // Can only ring when connected AND at least one doorbell owner is present
  let canRing = $derived($isConnected && $doorbellCount > 0)
  let isValid = $state(false)
  let ringing = $state(false)
  let ringCount = $state(0)
  let cooldownRemaining = $state(0)
  let lastSavedName = $state<string | null>(null)
  let mounted = true
  let cooldownInterval: ReturnType<typeof setInterval> | undefined

  // Save/update history when connected and we receive a name from P2P
  $effect(() => {
    if ($isConnected && isValid && $p2pDoorbellName && $p2pDoorbellName !== lastSavedName) {
      historyStore.addRingerDoorbell(token, $p2pDoorbellName)
      lastSavedName = $p2pDoorbellName
    }
  })

  // Track token changes and rejoin room when token changes (e.g., navigating to different doorbell)
  let lastToken = $state<string | null>(null)
  $effect(() => {
    if (token && token !== lastToken) {
      lastToken = token
      // Reset state for new doorbell
      isValid = isValidToken(token)
      ringCount = 0
      cooldownRemaining = 0
      clearInterval(cooldownInterval)
      cooldownInterval = undefined
      lastSavedName = null

      if (isValid) {
        // Join the new channel
        deriveTopicId(token).then(channelId => {
          if (!mounted) return
          if (import.meta.env.DEV) {
            console.log('[Ringer] Joining channel (token changed):', channelId)
          }
          p2pStore.joinChannel(channelId, () => {
            // Ringer doesn't need to handle incoming rings
          }, { kind: 'ringer' })
        })
      }
    }
  })

  function startCooldownTimer() {
    cooldownRemaining = COOLDOWN_SECONDS
    clearInterval(cooldownInterval)
    cooldownInterval = setInterval(() => {
      cooldownRemaining--
      if (cooldownRemaining <= 0) {
        clearInterval(cooldownInterval)
        cooldownInterval = undefined
      }
    }, 1000)
  }

  onMount(() => {
    // Load history from localStorage
    historyStore.loadFromStorage()
    // Channel joining is handled by the $effect watching token changes
  })

  function ringDoorbell() {
    if (!canRing || ringing || cooldownRemaining > 0) return

    ringing = true
    const success = p2pStore.sendRing()

    if (success) {
      ringCount++
      startCooldownTimer()
    }

    timeout.set(() => {
      ringing = false
    }, 500)
  }

  async function retryConnection() {
    if (isValid) {
      const channelId = await deriveTopicId(token)
      if (!mounted) return
      p2pStore.joinChannel(channelId, () => {}, { kind: 'ringer' })
    }
  }

  onDestroy(() => {
    mounted = false
    clearInterval(cooldownInterval)
    p2pStore.leave()
  })
</script>

<ConnectionError onRetry={retryConnection} />

<div class="ringer-view">
  <header>
    <div class="header-row">
      <a href="#/ring/" class="history-link" aria-label="My doorbells">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </a>
      <ConnectionStatus />
    </div>
    <h1>Ring {doorbellName}</h1>
  </header>

  <main id="main-content">
    {#if !isValid}
      <div class="error" role="alert">
        <h2>Invalid Link</h2>
        <p>This doorbell link is invalid or has expired.</p>
      </div>
    {:else}
      <div class="ring-section">
        <button
          class="ring-button"
          class:ringing
          class:not-connected={!canRing}
          class:cooldown={cooldownRemaining > 0}
          onclick={ringDoorbell}
          disabled={!canRing || ringing || cooldownRemaining > 0}
          data-testid="ring-button"
          aria-label={!canRing
            ? 'Ring doorbell - waiting for connection'
            : cooldownRemaining > 0
              ? `Ring doorbell - wait ${cooldownRemaining} seconds`
              : 'Ring doorbell'}
          aria-describedby="ring-instruction"
        >
          {#if !canRing}
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 2v4"/>
              <path d="m16.2 7.8 2.9-2.9"/>
              <path d="M18 12h4"/>
              <path d="m16.2 16.2 2.9 2.9"/>
              <path d="M12 18v4"/>
              <path d="m4.9 19.1 2.9-2.9"/>
              <path d="M2 12h4"/>
              <path d="m4.9 4.9 2.9 2.9"/>
            </svg>
          {:else if cooldownRemaining > 0}
            <span class="cooldown-text" aria-hidden="true">{cooldownRemaining}</span>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          {/if}
        </button>

        <p class="instruction" id="ring-instruction" role="status" aria-live="polite">
          {#if !$isConnected}
            Connecting to network...
          {:else if $doorbellCount === 0}
            Waiting for doorbell owner...
          {:else if ringing}
            Ringing...
          {:else if cooldownRemaining > 0}
            Wait {cooldownRemaining}s...
          {:else}
            Tap to ring
          {/if}
        </p>

        {#if ringCount > 0}
          <p class="ring-count" aria-live="polite">Rang {ringCount} time{ringCount !== 1 ? 's' : ''}</p>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  .ringer-view {
    min-height: 100vh;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .history-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.2);
    color: white;
    text-decoration: none;
    transition: background 0.2s;
  }

  .history-link:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .history-link:active {
    background: rgba(255, 255, 255, 0.4);
  }

  header :global(.status) {
    color: rgba(255, 255, 255, 0.8);
  }

  header :global(.peers) {
    color: rgba(255, 255, 255, 0.6);
  }

  h1 {
    font-size: 24px;
    color: white;
    margin: 0;
    text-align: center;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    width: 100%;
  }

  .ring-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .error {
    text-align: center;
    color: white;
    background: rgba(255, 255, 255, 0.1);
    padding: 32px;
    border-radius: var(--radius-xl);
  }

  .error h2 {
    margin: 0 0 12px 0;
    font-size: 24px;
  }

  .error p {
    margin: 0;
    opacity: 0.8;
  }

  .ring-button {
    width: 180px;
    height: 180px;
    border-radius: var(--radius-full);
    border: none;
    background: white;
    color: var(--color-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .ring-button:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4);
  }

  .ring-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .ring-button:disabled {
    cursor: not-allowed;
  }

  .ring-button.not-connected {
    background: #9ca3af;
    color: #6b7280;
    animation: pulse-connecting 2s ease-in-out infinite;
  }

  .ring-button.cooldown {
    background: #fef3c7;
    color: #d97706;
  }

  .cooldown-text {
    font-size: 48px;
    font-weight: bold;
  }

  @keyframes pulse-connecting {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.9; }
  }

  .ring-button.ringing {
    animation: ring-animation 0.5s ease-in-out;
  }

  @keyframes ring-animation {
    0%, 100% { transform: rotate(0); }
    20%, 60% { transform: rotate(-15deg); }
    40%, 80% { transform: rotate(15deg); }
  }

  .instruction {
    margin-top: 24px;
    color: white;
    font-size: 18px;
  }

  .ring-count {
    margin-top: 12px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
  }
</style>
