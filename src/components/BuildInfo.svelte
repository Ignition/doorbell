<script lang="ts">
  // __BUILD_TIME__ is already ISO format (2025-12-10T08:30:45.123Z)
  // Convert to: YYYY-MM-DD HH:MM:SS +00:00
  const timestamp = __BUILD_TIME__.replace('T', ' ').replace(/\.\d{3}Z$/, ' +00:00')
  const formatted = `${__BUILD_HASH__} · ${timestamp}`
</script>

<footer class="build-info">
  {formatted}
</footer>

<style>
  .build-info {
    position: fixed;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    color: rgba(255, 255, 255, 0.8);
    font-family: monospace;
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    background: rgba(0, 0, 0, 0.3);
    padding: 4px 8px;
    border-radius: 4px;
  }
</style>
