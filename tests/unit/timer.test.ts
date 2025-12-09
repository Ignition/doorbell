import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTimeout, createDebounce } from '../../src/lib/utils/timer'

describe('Timer Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createTimeout', () => {
    it('executes callback after specified delay', () => {
      const timeout = createTimeout()
      const callback = vi.fn()

      timeout.set(callback, 1000)

      expect(callback).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('returns timer id from set()', () => {
      const timeout = createTimeout()
      const id = timeout.set(() => {}, 1000)

      expect(id).toBeDefined()
    })

    it('can clear a specific timer', () => {
      const timeout = createTimeout()
      const callback = vi.fn()

      const id = timeout.set(callback, 1000)
      timeout.clear(id)

      vi.advanceTimersByTime(1000)
      expect(callback).not.toHaveBeenCalled()
    })

    it('clear() with undefined does nothing', () => {
      const timeout = createTimeout()
      const callback = vi.fn()

      timeout.set(callback, 1000)
      timeout.clear(undefined)

      vi.advanceTimersByTime(1000)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('clearAll() clears all pending timers', () => {
      const timeout = createTimeout()
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      timeout.set(callback1, 1000)
      timeout.set(callback2, 2000)
      timeout.set(callback3, 3000)

      timeout.clearAll()

      vi.advanceTimersByTime(5000)
      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
      expect(callback3).not.toHaveBeenCalled()
    })

    it('removes timer from internal set after execution', () => {
      const timeout = createTimeout()
      const callback = vi.fn()

      timeout.set(callback, 1000)
      vi.advanceTimersByTime(1000)

      // Calling clearAll after execution should not cause issues
      timeout.clearAll()
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('handles multiple timers independently', () => {
      const timeout = createTimeout()
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      timeout.set(callback1, 1000)
      timeout.set(callback2, 2000)

      vi.advanceTimersByTime(1000)
      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1000)
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })

  describe('createDebounce', () => {
    it('delays execution until after wait period', () => {
      const callback = vi.fn()
      const debounce = createDebounce()

      debounce.set(callback, 1000)

      expect(callback).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('resets delay on subsequent calls', () => {
      const callback = vi.fn()
      const debounce = createDebounce()

      debounce.set(callback, 1000)
      vi.advanceTimersByTime(500)

      debounce.set(callback, 1000)
      vi.advanceTimersByTime(500)

      expect(callback).not.toHaveBeenCalled()

      vi.advanceTimersByTime(500)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('can be cancelled before execution', () => {
      const callback = vi.fn()
      const debounce = createDebounce()

      debounce.set(callback, 1000)
      debounce.cancel()

      vi.advanceTimersByTime(1000)
      expect(callback).not.toHaveBeenCalled()
    })

    it('uses latest callback when called multiple times', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()
      const debounce = createDebounce()

      debounce.set(callback1, 1000)
      debounce.set(callback2, 1000)
      debounce.set(callback3, 1000)

      vi.advanceTimersByTime(1000)
      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
      expect(callback3).toHaveBeenCalledTimes(1)
    })
  })
})
