<script lang="ts">
  import { generateQRCodeDataUrl } from '$lib/utils'

  let { url }: { url: string } = $props()

  let qrDataUrl = $state('')
  let error = $state('')

  $effect(() => {
    if (url) {
      let cancelled = false

      generateQRCodeDataUrl(url)
        .then(dataUrl => {
          if (!cancelled) {
            qrDataUrl = dataUrl
          }
        })
        .catch(e => {
          if (!cancelled) {
            error = 'Failed to generate QR code'
            if (import.meta.env.DEV) {
              console.warn('QR generation failed:', e)
            }
          }
        })

      return () => {
        cancelled = true
      }
    }
  })
</script>

<div class="qr-container" data-testid="qr-code">
  {#if error}
    <div class="error">{error}</div>
  {:else if qrDataUrl}
    <img src={qrDataUrl} alt="QR Code for doorbell URL" />
  {:else}
    <div class="loading">Generating QR code...</div>
  {/if}
</div>

<style>
  .qr-container {
    display: flex;
    justify-content: center;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  img {
    width: 256px;
    height: 256px;
  }

  .loading {
    width: 256px;
    height: 256px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280; /* Improved contrast */
  }

  .error {
    width: 256px;
    height: 256px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #dc3545;
    text-align: center;
  }
</style>
