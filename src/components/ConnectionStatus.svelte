<script lang="ts">
  import { connectionState, peerCount } from '../stores/p2p'

  const stateLabels: Record<string, string> = {
    initializing: 'Initializing...',
    connecting: 'Connecting to network...',
    connected: 'Connected',
    error: 'Connection error'
  }
</script>

<div
  class="status"
  data-testid="connection-status"
  role="status"
  aria-live="polite"
  aria-label="Connection status: {stateLabels[$connectionState]}{$connectionState === 'connected' ? `, ${$peerCount} peers connected` : ''}"
>
  <span
    class="indicator"
    class:initializing={$connectionState === 'initializing'}
    class:connecting={$connectionState === 'connecting'}
    class:connected={$connectionState === 'connected'}
    class:error={$connectionState === 'error'}
    aria-hidden="true"
  >
    {#if $connectionState === 'connected'}
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    {:else if $connectionState === 'error'}
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    {/if}
  </span>
  <span class="label">{stateLabels[$connectionState]}</span>
  {#if $connectionState === 'connected'}
    <span class="peers">({$peerCount} peer{$peerCount !== 1 ? 's' : ''})</span>
  {/if}
</div>

<style>
  .status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 14px;
    color: var(--text-secondary);
  }

  .indicator {
    width: 16px;
    height: 16px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .indicator.initializing {
    background-color: #9ca3af;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .indicator.connecting {
    background-color: var(--color-warning);
    animation: pulse 1s ease-in-out infinite;
  }

  .indicator.connected {
    background-color: var(--color-success);
    color: white;
  }

  .indicator.error {
    background-color: var(--color-error);
    color: white;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .peers {
    color: var(--text-muted);
    font-size: 12px;
  }
</style>
