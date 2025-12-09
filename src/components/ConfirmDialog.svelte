<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'

  interface Props {
    title: string
    message: string
    subjectName?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    onConfirm: () => void
    onCancel: () => void
  }

  let {
    title,
    message,
    subjectName,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    onConfirm,
    onCancel
  }: Props = $props()

  let dialogElement: HTMLDivElement | undefined

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown)
    dialogElement?.focus()
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
</script>

<div
  class="overlay"
  onclick={handleBackdropClick}
  role="presentation"
  transition:fly={{ y: -10, duration: 200 }}
>
  <div
    bind:this={dialogElement}
    class="dialog"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    aria-describedby="dialog-message"
    tabindex="-1"
  >
    <h2 id="dialog-title">{title}</h2>
    <p id="dialog-message">
      {#if subjectName}
        {message} <strong class="subject-name">{subjectName}</strong>?
      {:else}
        {message}
      {/if}
    </p>
    <div class="actions">
      <button class="cancel-btn" onclick={onCancel}>
        {cancelLabel}
      </button>
      <button
        class="confirm-btn"
        class:destructive
        onclick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--bg-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: var(--space-5);
  }

  .dialog {
    background: white;
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 400px;
    width: 100%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  h2 {
    margin: 0 0 var(--space-3) 0;
    font-size: 20px;
    color: var(--text-primary);
  }

  p {
    margin: 0 0 var(--space-6) 0;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .subject-name {
    color: var(--text-primary);
    font-weight: 600;
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  button {
    padding: 10px 20px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: var(--bg-light);
    color: var(--text-primary);
    border: none;
  }

  .cancel-btn:hover {
    background: #e5e7eb;
  }

  .confirm-btn {
    background: var(--color-primary);
    color: white;
    border: none;
  }

  .confirm-btn:hover {
    background: var(--color-primary-hover);
  }

  .confirm-btn.destructive {
    background: var(--color-error);
  }

  .confirm-btn.destructive:hover {
    background: var(--color-error-hover);
  }
</style>
