<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { replace } from 'svelte-spa-router'
  import { p2pStore, isConnected } from '../stores/p2p'
  import { notificationStore } from '../stores/notifications'
  import { historyStore } from '../stores/history'
  import { generateToken, deriveTopicId, isValidToken } from '$lib/crypto'
  import {
    enableAudio,
    isAudioUnmuted,
    setAudioMuted,
    playDoorbellSound,
    requestNotificationPermission,
    showBrowserNotification,
    getNotificationPermission
  } from '$lib/notifications'
  import { createTimeout, createDebounce, generateDoorbellName, buildRingerUrl, buildDoorbellUrl, formatHistoryDate } from '$lib/utils'
  import { MAX_DOORBELL_NAME_LENGTH, STORAGE_KEYS } from '$lib/config'
  import type { DoorbellHistoryEntry } from '$lib/storage'
  import { getDoorbellHistory, getBooleanPreference, setBooleanPreference } from '$lib/storage'
  import ConnectionStatus from './ConnectionStatus.svelte'
  import ConnectionError from './ConnectionError.svelte'
  import QRCode from './QRCode.svelte'
  import NotificationList from './NotificationList.svelte'
  import DramaticAlert from './DramaticAlert.svelte'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import type { DoorbellMessage } from '$lib/p2p'

  const timeout = createTimeout()
  const debounce = createDebounce()

  // Route params - token comes from URL
  let { params = { token: '' } }: { params: { token: string } } = $props()

  let token = $derived(params.token)
  let doorbellName = $state('')
  let copied = $state(false)
  let copiedDoorbell = $state(false)
  let notificationPermission = $state(getNotificationPermission())
  let currentEntryId = $state<string | null>(null)
  let mounted = true

  // UI state
  let shareBoxCollapsed = $state(false)
  let dramaticMode = $state(false)
  let dramaticAlertTimestamp = $state<number | null>(null)
  let soundEnabled = $state(false)
  let notificationsEnabled = $state(getNotificationPermission() === 'granted')

  // Confirmation dialog state
  let confirmDelete = $state<{ id: string; name: string } | null>(null)
  let confirmClearAll = $state(false)

  const { doorbellHistory } = historyStore

  // Load preferences from localStorage
  function loadPreferences() {
    shareBoxCollapsed = getBooleanPreference(STORAGE_KEYS.shareBoxCollapsed, false)
    dramaticMode = getBooleanPreference(STORAGE_KEYS.dramaticMode, false)
    // Sound always starts off - requires user gesture to enable AudioContext
    notificationsEnabled = getBooleanPreference(STORAGE_KEYS.notificationsEnabled, false)
      && getNotificationPermission() === 'granted' // Only enable if still has permission
  }

  function saveShareBoxCollapsed(value: boolean) {
    shareBoxCollapsed = value
    setBooleanPreference(STORAGE_KEYS.shareBoxCollapsed, value)
  }

  function saveDramaticMode(value: boolean) {
    dramaticMode = value
    setBooleanPreference(STORAGE_KEYS.dramaticMode, value)
  }

  function dismissDramaticAlert() {
    dramaticAlertTimestamp = null
  }

  // Generate share URLs when token changes
  let ringerShareUrl = $derived(token ? buildRingerUrl(token) : '')
  let doorbellShareUrl = $derived(token ? buildDoorbellUrl(token) : '')

  // Track token changes and join room when token changes
  let lastToken = $state<string | null>(null)
  $effect(() => {
    if (token && token !== lastToken) {
      lastToken = token

      // Validate token
      if (!isValidToken(token)) {
        if (import.meta.env.DEV) {
          console.warn('[Doorbell] Invalid token, redirecting')
        }
        replace('/doorbell')
        return
      }

      // Load history and preferences
      historyStore.loadFromStorage()
      loadPreferences()

      // Check if this token exists in history
      const history = getDoorbellHistory()
      const existingEntry = history.find(e => e.token === token)

      if (existingEntry) {
        doorbellName = existingEntry.name
        currentEntryId = existingEntry.id
        historyStore.updateDoorbell(existingEntry.id, { lastUsedAt: Date.now() })
        if (import.meta.env.DEV) {
          console.log('[Doorbell] Restored from history:', doorbellName)
        }
      } else {
        // New doorbell from shared link - generate a name and save
        doorbellName = generateDoorbellName()
        const entry = historyStore.addDoorbell(token, doorbellName)
        currentEntryId = entry.id
        if (import.meta.env.DEV) {
          console.log('[Doorbell] New shared doorbell:', token.slice(0, 10) + '...')
        }
      }

      // Join channel
      deriveTopicId(token).then(channelId => {
        if (!mounted) return
        if (import.meta.env.DEV) {
          console.log('[Doorbell] Joining channel:', channelId)
        }
        p2pStore.joinChannel(channelId, handleRing, { getDoorbellName: () => doorbellName, kind: 'doorbell' })
      })
    }
  })

  onMount(() => {
    if (import.meta.env.DEV) {
      console.log('[Doorbell] onMount starting')
    }
    // Token handling is done via $effect watching token changes
  })

  /**
   * Toggle sound. First toggle must enable AudioContext via user gesture
   * due to browser autoplay policy - browsers block audio until user interaction.
   */
  async function toggleSound() {
    if (!soundEnabled) {
      // First enable - need to unlock AudioContext via user gesture
      const success = await enableAudio()
      if (success) {
        soundEnabled = true
        setAudioMuted(false)
        // Play a short sound to confirm
        playDoorbellSound()
      }
    } else {
      // Toggle mute
      soundEnabled = false
      setAudioMuted(true)
    }
  }

  async function toggleNotifications() {
    if (!notificationsEnabled) {
      const permission = await requestNotificationPermission()
      notificationsEnabled = permission === 'granted'
      notificationPermission = permission
      setBooleanPreference(STORAGE_KEYS.notificationsEnabled, notificationsEnabled)
    } else {
      // Can't revoke permission, but we can disable showing them
      notificationsEnabled = false
      setBooleanPreference(STORAGE_KEYS.notificationsEnabled, false)
    }
  }

  function handleRing(msg: DoorbellMessage) {
    playDoorbellSound()
    if (notificationsEnabled) {
      showBrowserNotification('Doorbell', 'Someone is at the door!')
    }

    if (dramaticMode) {
      // Dramatic mode uses full-screen alert, no toaster notifications
      dramaticAlertTimestamp = msg.timestamp
    } else {
      // Normal mode uses toaster notifications
      notificationStore.addRing(msg.timestamp)
    }
  }

  function handleNameChange(e: Event) {
    const input = e.target as HTMLInputElement
    doorbellName = input.value.slice(0, MAX_DOORBELL_NAME_LENGTH)

    // Debounced save to history and broadcast to connected peers
    debounce.set(() => {
      if (currentEntryId && doorbellName) {
        historyStore.updateDoorbell(currentEntryId, { name: doorbellName })
        // Send updated name to any connected publishers
        p2pStore.sendInfo(doorbellName)
      }
    }, 500)
  }

  function selectFromHistory(entry: DoorbellHistoryEntry) {
    // Navigate to the selected doorbell - $effect handles joining room
    replace(`/doorbell/${entry.token}`)
  }

  function createNewDoorbell() {
    // Generate new token and save to history
    const newToken = generateToken()
    const name = generateDoorbellName()
    historyStore.addDoorbell(newToken, name)
    // Navigate to new doorbell - $effect handles joining room
    replace(`/doorbell/${newToken}`)
  }

  function deleteHistoryEntry(id: string, name: string) {
    confirmDelete = { id, name }
  }

  function confirmDeleteEntry() {
    if (confirmDelete) {
      const isDeletingCurrent = confirmDelete.id === currentEntryId
      historyStore.deleteDoorbell(confirmDelete.id)
      confirmDelete = null

      if (isDeletingCurrent) {
        // Deleted the active doorbell - create a new one
        createNewDoorbell()
      }
    }
  }

  function clearHistory() {
    confirmClearAll = true
  }

  function confirmClearAllEntries() {
    historyStore.clearDoorbellHistory()
    confirmClearAll = false
    // Create a new doorbell after clearing all history
    createNewDoorbell()
  }


  let copyTimerId: ReturnType<typeof setTimeout> | undefined
  let copyDoorbellTimerId: ReturnType<typeof setTimeout> | undefined

  async function copyRingerUrl() {
    // Clipboard API may not be available in insecure contexts (non-HTTPS)
    if (!navigator.clipboard) {
      const input = document.getElementById('ringer-share-url') as HTMLInputElement
      input?.select()
      return
    }

    try {
      await navigator.clipboard.writeText(ringerShareUrl)
      copied = true
      timeout.clear(copyTimerId)
      copyTimerId = timeout.set(() => (copied = false), 2000)
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Failed to copy to clipboard:', e)
      }
      const input = document.getElementById('ringer-share-url') as HTMLInputElement
      input?.select()
    }
  }

  async function copyDoorbellUrl() {
    if (!navigator.clipboard) {
      const input = document.getElementById('subscriber-share-url') as HTMLInputElement
      input?.select()
      return
    }

    try {
      await navigator.clipboard.writeText(doorbellShareUrl)
      copiedDoorbell = true
      timeout.clear(copyDoorbellTimerId)
      copyDoorbellTimerId = timeout.set(() => (copiedDoorbell = false), 2000)
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Failed to copy to clipboard:', e)
      }
      const input = document.getElementById('subscriber-share-url') as HTMLInputElement
      input?.select()
    }
  }

  async function retryConnection() {
    const channelId = await deriveTopicId(token)
    p2pStore.joinChannel(channelId, handleRing, { getDoorbellName: () => doorbellName, kind: 'doorbell' })
  }

  onDestroy(() => {
    mounted = false
    p2pStore.leave()
  })
</script>

<ConnectionError onRetry={retryConnection} />

{#if dramaticAlertTimestamp !== null}
  <DramaticAlert timestamp={dramaticAlertTimestamp} onDismiss={dismissDramaticAlert} />
{/if}

<div class="subscriber-view">
  <NotificationList />

  <header>
    <h1>Doorbell</h1>
    <ConnectionStatus />
  </header>

  <main id="main-content">
    <section class="share-section" aria-label="Doorbell sharing">
      <div class="name-section">
        <label for="doorbell-name">Doorbell Name</label>
        <div class="name-row">
          <input
            id="doorbell-name"
            type="text"
            value={doorbellName}
            oninput={handleNameChange}
            maxlength={MAX_DOORBELL_NAME_LENGTH}
            placeholder="Enter a name for this doorbell"
            data-testid="doorbell-name"
          />
          <button
            onclick={createNewDoorbell}
            class="new-btn"
            title="Create a new doorbell with fresh token"
          >
            New
          </button>
        </div>
      </div>

      <div class="share-box" class:collapsed={shareBoxCollapsed}>
        <button
          class="share-box-toggle"
          onclick={() => saveShareBoxCollapsed(!shareBoxCollapsed)}
          aria-expanded={!shareBoxCollapsed}
        >
          <span>Share Link & QR Code</span>
          <svg
            class="chevron"
            class:rotated={shareBoxCollapsed}
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        {#if !shareBoxCollapsed}
          <div class="share-box-content">
            <div class="share-tabs">
              <h4>For Ringers</h4>
              <p class="share-description">Share with people who should be able to ring your doorbell.</p>

              <div class="url-container">
                <label for="ringer-share-url" class="visually-hidden">Shareable doorbell URL for ringers</label>
                <input
                  id="ringer-share-url"
                  type="text"
                  readonly
                  value={ringerShareUrl}
                  data-testid="share-url"
                />
                <button
                  onclick={copyRingerUrl}
                  class="copy-btn"
                  aria-live="polite"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <QRCode url={ringerShareUrl} />
            </div>

            <div class="share-tabs subscriber-share">
              <h4>For Other Devices</h4>
              <p class="share-description">Share with other devices that should also receive rings.</p>

              <div class="url-container">
                <label for="subscriber-share-url" class="visually-hidden">Shareable doorbell URL for subscribers</label>
                <input
                  id="subscriber-share-url"
                  type="text"
                  readonly
                  value={doorbellShareUrl}
                  data-testid="subscriber-share-url"
                />
                <button
                  onclick={copyDoorbellUrl}
                  class="copy-btn"
                  aria-live="polite"
                >
                  {copiedDoorbell ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <QRCode url={doorbellShareUrl} />
            </div>
          </div>
        {/if}
      </div>
    </section>

    <section class="settings-section">
      <label class="toggle-label">
        <span>Sound</span>
        <span class="toggle-description">Play doorbell sound when someone rings</span>
        <button
          class="toggle-switch"
          class:active={soundEnabled}
          onclick={toggleSound}
          role="switch"
          aria-checked={soundEnabled}
          aria-label="Toggle sound"
        >
          <span class="toggle-knob"></span>
        </button>
      </label>

      <label class="toggle-label">
        <span>Notifications</span>
        <span class="toggle-description">Show browser notification when someone rings</span>
        <button
          class="toggle-switch"
          class:active={notificationsEnabled}
          onclick={toggleNotifications}
          role="switch"
          aria-checked={notificationsEnabled}
          aria-label="Toggle notifications"
        >
          <span class="toggle-knob"></span>
        </button>
      </label>

      <label class="toggle-label">
        <span>Dramatic Mode</span>
        <span class="toggle-description">Full-screen alert when doorbell rings</span>
        <button
          class="toggle-switch"
          class:active={dramaticMode}
          onclick={() => saveDramaticMode(!dramaticMode)}
          role="switch"
          aria-checked={dramaticMode}
          aria-label="Toggle dramatic mode"
        >
          <span class="toggle-knob"></span>
        </button>
      </label>
    </section>

    {#if $doorbellHistory.length > 0}
      <section class="history-section">
        <h3>Your Doorbells</h3>
        <ul class="history-list">
          {#each $doorbellHistory as entry (entry.id)}
            <li class="history-entry" class:active={entry.id === currentEntryId}>
              <div class="entry-info">
                <span class="name">{entry.name}</span>
                <span class="date">Created: {formatHistoryDate(entry.createdAt)}</span>
              </div>
              <div class="entry-actions">
                {#if entry.id !== currentEntryId}
                  <button class="use-btn" onclick={() => selectFromHistory(entry)}>Use</button>
                {/if}
                <button class="delete-btn" onclick={() => deleteHistoryEntry(entry.id, entry.name)}>Delete</button>
              </div>
            </li>
          {/each}
        </ul>
        <button class="clear-all-btn" onclick={clearHistory}>Clear All History</button>
      </section>
    {/if}
  </main>
</div>

{#if confirmDelete}
  <ConfirmDialog
    title="Delete Doorbell"
    message="Are you sure you want to delete"
    subjectName={confirmDelete.name}
    confirmLabel="Delete"
    destructive={true}
    onConfirm={confirmDeleteEntry}
    onCancel={() => confirmDelete = null}
  />
{/if}

{#if confirmClearAll}
  <ConfirmDialog
    title="Clear All History"
    message="Are you sure you want to delete all doorbells from your history? This cannot be undone."
    confirmLabel="Clear All"
    destructive={true}
    onConfirm={confirmClearAllEntries}
    onCancel={() => confirmClearAll = false}
  />
{/if}

<style>
  .subscriber-view {
    min-height: 100vh;
    padding: 20px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  h1 {
    font-size: 28px;
    color: var(--text-primary);
    margin: 0;
  }

  main {
    max-width: 400px;
    margin: 0 auto;
  }

  section {
    margin-bottom: 24px;
  }

  h3 {
    font-size: 18px;
    color: var(--text-primary);
    margin: 0 0 12px 0;
  }

  p {
    color: var(--text-secondary);
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  .name-section {
    margin-bottom: 16px;
  }

  .name-section label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .name-row {
    display: flex;
    gap: 8px;
  }

  .name-section input {
    flex: 1;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: var(--radius-md);
    font-size: 16px;
    background: white;
  }

  .new-btn {
    padding: 12px 16px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;
    transition: background 0.2s;
  }

  .new-btn:hover {
    background: #218838;
  }

  .share-box {
    background: white;
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 16px;
  }

  .share-box-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: white;
    border: none;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .share-box-toggle:hover {
    background: #f8f9fa;
  }

  .chevron {
    transition: transform 0.2s;
  }

  .chevron.rotated {
    transform: rotate(-90deg);
  }

  .share-box-content {
    padding: 0 16px 16px;
  }

  .share-tabs {
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid #eee;
  }

  .share-tabs:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .share-tabs h4 {
    margin: 0 0 8px 0;
    font-size: 15px;
    color: var(--text-primary);
  }

  .share-description {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 12px 0;
    line-height: 1.4;
  }

  .subscriber-share h4 {
    color: #667eea;
  }

  .settings-section {
    background: white;
    border-radius: var(--radius-lg);
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .toggle-label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .toggle-label > span:first-child {
    font-weight: 500;
    color: var(--text-primary);
  }

  .toggle-description {
    flex-basis: 100%;
    font-size: 13px;
    color: var(--text-secondary);
    order: 3;
  }

  .toggle-switch {
    margin-left: auto;
    width: 50px;
    height: 28px;
    background: #ddd;
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
  }

  .toggle-switch.active {
    background: #667eea;
  }

  .toggle-knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .toggle-switch.active .toggle-knob {
    transform: translateX(22px);
  }

  .url-container {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .url-container input {
    flex: 1;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: var(--radius-md);
    font-size: 14px;
    background: white;
  }

  .copy-btn {
    padding: 12px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .copy-btn:hover {
    background: #5a6fd6;
  }

  .history-section {
    background: white;
    border-radius: var(--radius-lg);
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .history-list {
    list-style: none;
    padding: 0;
    margin: 0 0 12px 0;
  }

  .history-entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-radius: var(--radius-md);
    margin-bottom: 8px;
    background: #f8f9fa;
  }

  .history-entry.active {
    background: #e8f4fd;
    border: 1px solid #667eea;
  }

  .entry-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .entry-info .name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .entry-info .date {
    font-size: 12px;
    color: var(--text-muted);
  }

  .entry-actions {
    display: flex;
    gap: 8px;
  }

  .use-btn {
    padding: 6px 12px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 13px;
  }

  .use-btn:hover {
    background: #5a6fd6;
  }

  .delete-btn {
    padding: 6px 12px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 13px;
  }

  .delete-btn:hover {
    background: #c82333;
  }

  .clear-all-btn {
    width: 100%;
    padding: 10px;
    background: transparent;
    color: #dc3545;
    border: 1px solid #dc3545;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 14px;
  }

  .clear-all-btn:hover {
    background: #dc3545;
    color: white;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
