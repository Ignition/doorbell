<script lang="ts">
  import { connectionState } from '../stores/p2p'
  import { RETRY_COOLDOWN_MS } from '$lib/config'
  import { createTimeout } from '$lib/utils'

  let { onRetry }: { onRetry: () => void } = $props()

  const timeout = createTimeout()
  let retrying = $state(false)

  function handleRetry() {
    if (retrying) return

    retrying = true
    onRetry()

    // Reset retrying state after cooldown
    timeout.set(() => {
      retrying = false
    }, RETRY_COOLDOWN_MS)
  }
</script>

{#if $connectionState === 'error'}
  <div class="error-overlay" role="alertdialog" aria-labelledby="error-title" aria-describedby="error-description">
    <div class="error-card">
      <div class="icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 id="error-title">Connection Failed</h2>
      <p id="error-description">Unable to connect to the P2P network. This could be due to:</p>
      <ul>
        <li>Network firewall blocking WebRTC</li>
        <li>Corporate network restrictions</li>
        <li>Temporary network issues</li>
      </ul>
      <button onclick={handleRetry} disabled={retrying}>
        {retrying ? 'Retrying...' : 'Try Again'}
      </button>
    </div>
  </div>
{/if}

<style>
  .error-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .error-card {
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .icon {
    color: #ef4444;
    margin-bottom: 16px;
  }

  h2 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 24px;
  }

  p {
    color: #666;
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  ul {
    text-align: left;
    color: #666;
    margin: 0 0 24px 0;
    padding-left: 24px;
  }

  li {
    margin-bottom: 8px;
  }

  button {
    background: #667eea;
    color: white;
    border: none;
    padding: 12px 32px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover:not(:disabled) {
    background: #5a6fd6;
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>
