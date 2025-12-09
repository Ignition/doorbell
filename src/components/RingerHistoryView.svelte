<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import { historyStore } from '../stores/history'
  import { formatHistoryDate } from '$lib/utils'
  import type { RingerHistoryEntry } from '$lib/storage'
  import ConfirmDialog from './ConfirmDialog.svelte'

  const { ringerHistory } = historyStore

  let confirmDelete = $state<{ id: string; name: string } | null>(null)
  let confirmClearAll = $state(false)

  onMount(() => {
    historyStore.loadFromStorage()
  })

  function ringDoorbell(entry: RingerHistoryEntry) {
    push(`/ring/${entry.token}`)
  }

  function deleteEntry(id: string, name: string) {
    confirmDelete = { id, name }
  }

  function confirmDeleteEntry() {
    if (confirmDelete) {
      historyStore.deleteRingerDoorbell(confirmDelete.id)
      confirmDelete = null
    }
  }

  function clearAll() {
    confirmClearAll = true
  }

  function confirmClearAllEntries() {
    historyStore.clearRingerHistory()
    confirmClearAll = false
  }
</script>

<div class="history-view">
  <header>
    <h1>Doorbell History</h1>
  </header>

  <main id="main-content">
    {#if $ringerHistory.length === 0}
      <div class="empty-state" role="status">
        <div class="icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
        </div>
        <h2>No Doorbells Yet</h2>
        <p>When someone shares a doorbell link with you and you ring it, it will appear here for easy access.</p>
      </div>
    {:else}
      <section class="history-section" aria-label="Saved doorbells">
        <ul class="history-list" role="list">
          {#each $ringerHistory as entry (entry.id)}
            <li class="history-entry">
              <div class="entry-info">
                <span class="name" id="doorbell-{entry.id}">{entry.name}</span>
                <span class="date">Last rung: {formatHistoryDate(entry.lastRungAt)}</span>
              </div>
              <div class="entry-actions" role="group" aria-label="Actions for {entry.name}">
                <button
                  class="ring-btn"
                  onclick={() => ringDoorbell(entry)}
                  aria-describedby="doorbell-{entry.id}"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                  </svg>
                  Ring
                </button>
                <button
                  class="delete-btn"
                  onclick={() => deleteEntry(entry.id, entry.name)}
                  aria-label="Delete {entry.name}"
                >
                  Delete
                </button>
              </div>
            </li>
          {/each}
        </ul>
        <button class="clear-all-btn" onclick={clearAll} aria-label="Clear all doorbell history">
          Clear All History
        </button>
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
  .history-view {
    min-height: 100vh;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  header {
    margin-bottom: 32px;
  }

  h1 {
    font-size: 28px;
    color: white;
    margin: 0;
  }

  main {
    max-width: 500px;
    margin: 0 auto;
  }

  .empty-state {
    text-align: center;
    color: white;
    background: rgba(255, 255, 255, 0.1);
    padding: 48px 32px;
    border-radius: var(--radius-xl);
  }

  .empty-state .icon {
    margin-bottom: 24px;
    opacity: 0.7;
  }

  .empty-state h2 {
    margin: 0 0 12px 0;
    font-size: 24px;
  }

  .empty-state p {
    margin: 0;
    opacity: 0.8;
    line-height: 1.5;
  }

  .history-section {
    background: white;
    border-radius: var(--radius-xl);
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .history-list {
    list-style: none;
    padding: 0;
    margin: 0 0 16px 0;
  }

  .history-entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-radius: var(--radius-lg);
    margin-bottom: 12px;
    background: var(--bg-light);
  }

  .history-entry:last-child {
    margin-bottom: 0;
  }

  .entry-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .entry-info .name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 16px;
  }

  .entry-info .date {
    font-size: 13px;
    color: var(--text-muted);
  }

  .entry-actions {
    display: flex;
    gap: 8px;
  }

  .ring-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  }

  .ring-btn:hover {
    background: var(--color-primary-hover);
  }

  .delete-btn {
    padding: 8px 12px;
    background: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .delete-btn:hover {
    background: var(--color-error);
    color: white;
  }

  .clear-all-btn {
    width: 100%;
    padding: 12px;
    margin-top: 16px;
    background: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .clear-all-btn:hover {
    background: var(--color-error);
    color: white;
  }
</style>
