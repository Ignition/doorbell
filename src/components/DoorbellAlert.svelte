<script lang="ts">
  import { notificationStore, type RingNotification } from '../stores/notifications'
  import { fly, scale } from 'svelte/transition'
  import { formatTime } from '$lib/utils'

  let { notification }: { notification: RingNotification } = $props()

  function dismiss() {
    notificationStore.dismiss(notification.id)
  }
</script>

<div
  class="alert"
  data-testid="doorbell-alert"
  role="alert"
  aria-label="Doorbell rang at {formatTime(notification.timestamp)}"
  in:scale={{ duration: 300 }}
  out:fly={{ x: 300, duration: 200 }}
>
  <div class="icon" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  </div>
  <div class="content">
    <div class="title">Doorbell!</div>
    <div class="time">{formatTime(notification.timestamp)}</div>
  </div>
  <button class="dismiss" onclick={dismiss} aria-label="Dismiss notification">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
</div>

<style>
  .alert {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    max-width: 360px;
  }

  .icon {
    flex-shrink: 0;
    animation: ring 0.5s ease-in-out infinite alternate;
  }

  @keyframes ring {
    0% { transform: rotate(-15deg); }
    100% { transform: rotate(15deg); }
  }

  .content {
    flex: 1;
  }

  .title {
    font-size: 18px;
    font-weight: 600;
  }

  .time {
    font-size: 12px;
    opacity: 0.8;
  }

  .dismiss {
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    transition: background 0.2s;
  }

  .dismiss:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
