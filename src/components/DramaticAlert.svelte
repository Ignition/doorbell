<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'
  import { formatTime } from '$lib/utils'

  interface Props {
    timestamp: number
    onDismiss: () => void
  }

  let { timestamp, onDismiss }: Props = $props()
  let alertElement: HTMLDivElement | undefined

  function handleKeydown(e: KeyboardEvent) {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault()
      onDismiss()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown)
    // Focus the alert for screen readers and keyboard users
    alertElement?.focus()
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
</script>

<div
  bind:this={alertElement}
  class="dramatic-alert"
  onclick={onDismiss}
  onkeydown={(e) => (e.code === 'Space' || e.key === 'Escape' || e.key === 'Enter') && onDismiss()}
  role="alertdialog"
  aria-modal="true"
  aria-label="Doorbell ringing - press Space, Enter, or Escape to dismiss"
  tabindex="-1"
  transition:fly={{ y: -50, duration: 300 }}
>
  <div class="content">
    <div class="bell-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
    </div>
    <h1>DOORBELL!</h1>
    <p class="time">{formatTime(timestamp)}</p>
    <p class="dismiss-hint">Tap anywhere or press Space, Enter, or Escape to dismiss</p>
  </div>
</div>

<style>
  .dramatic-alert {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    animation: pulse-bg 1s ease-in-out infinite;
    cursor: pointer;
  }

  @keyframes pulse-bg {
    0%, 100% {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    50% {
      background: linear-gradient(135deg, #764ba2 0%, #f093fb 100%);
    }
  }

  .content {
    text-align: center;
    color: white;
  }

  .bell-icon {
    animation: ring-bell 0.5s ease-in-out infinite;
    margin-bottom: 24px;
  }

  @keyframes ring-bell {
    0%, 100% { transform: rotate(0); }
    25% { transform: rotate(-20deg); }
    75% { transform: rotate(20deg); }
  }

  h1 {
    font-size: 64px;
    font-weight: 900;
    margin: 0 0 16px 0;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    animation: scale-text 0.5s ease-in-out infinite alternate;
  }

  @keyframes scale-text {
    from { transform: scale(1); }
    to { transform: scale(1.05); }
  }

  .time {
    font-size: 24px;
    opacity: 0.9;
    margin: 0 0 32px 0;
  }

  .dismiss-hint {
    font-size: 16px;
    opacity: 0.7;
    margin: 0;
  }
</style>
