import { onDestroy } from 'svelte'

/**
 * Creates a timeout manager that auto-clears on component destroy.
 * Avoids null checks by using a Set internally.
 */
export function createTimeout() {
  const timers = new Set<ReturnType<typeof setTimeout>>()

  // Auto-cleanup on component destroy (only works in component context)
  try {
    onDestroy(() => {
      timers.forEach(id => clearTimeout(id))
      timers.clear()
    })
  } catch {
    // Not in component context (e.g., store) - manual cleanup required
  }

  return {
    set(callback: () => void, ms: number) {
      const id = setTimeout(() => {
        timers.delete(id)
        callback()
      }, ms)
      timers.add(id)
      return id
    },

    clear(id?: ReturnType<typeof setTimeout>) {
      if (id !== undefined) {
        clearTimeout(id)
        timers.delete(id)
      }
    },

    clearAll() {
      timers.forEach(id => clearTimeout(id))
      timers.clear()
    }
  }
}

/**
 * Creates a debounce manager that auto-clears on component destroy.
 * Usage: const debounce = createDebounce(); debounce.set(() => { ... }, 500);
 */
export function createDebounce() {
  const timeout = createTimeout()
  let lastId: ReturnType<typeof setTimeout> | undefined

  return {
    set(callback: () => void, ms: number) {
      if (lastId !== undefined) {
        timeout.clear(lastId)
      }
      lastId = timeout.set(callback, ms)
    },

    cancel() {
      if (lastId !== undefined) {
        timeout.clear(lastId)
        lastId = undefined
      }
    }
  }
}
