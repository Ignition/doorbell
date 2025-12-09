<script lang="ts">
  import { onMount } from 'svelte'
  import { replace } from 'svelte-spa-router'
  import { getDoorbellHistory } from '$lib/storage'
  import { generateToken } from '$lib/crypto'
  import { generateDoorbellName } from '$lib/utils'
  import { historyStore } from '../stores/history'

  onMount(() => {
    // Load history from localStorage
    historyStore.loadFromStorage()

    const history = getDoorbellHistory()
    let token: string

    if (history.length > 0) {
      // Use most recent doorbell
      token = history[0].token
    } else {
      // Generate new token and save to history
      token = generateToken()
      const name = generateDoorbellName()
      historyStore.addDoorbell(token, name)
    }

    // Redirect to the specific doorbell URL
    replace(`/doorbell/${token}`)
  })
</script>

<div class="loading">
  <p>Loading doorbell...</p>
</div>

<style>
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  }

  p {
    color: #666;
    font-size: 18px;
  }
</style>
