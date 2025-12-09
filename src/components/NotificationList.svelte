<script lang="ts">
  import { notificationStore } from '../stores/notifications'
  import DoorbellAlert from './DoorbellAlert.svelte'
</script>

<div
  class="notification-list"
  role="region"
  aria-label="Doorbell notifications"
  aria-live="polite"
>
  {#each $notificationStore as notification (notification.id)}
    <DoorbellAlert {notification} />
  {/each}
</div>

<style>
  .notification-list {
    position: fixed;
    top: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 1000;
  }
</style>
