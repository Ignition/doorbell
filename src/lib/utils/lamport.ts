/**
 * Lamport logical clock for distributed consistency.
 *
 * Provides a partial ordering of events across distributed peers.
 * See: https://en.wikipedia.org/wiki/Lamport_timestamp
 */
export class LamportClock {
  private localClock = 0
  private peerClocks = new Map<string, number>()

  /**
   * Increment and return the clock value for sending a message.
   * Must be called before each send.
   */
  tick(): number {
    return ++this.localClock
  }

  /**
   * Get the current clock value without incrementing.
   */
  get value(): number {
    return this.localClock
  }

  /**
   * Process a received message's clock value.
   * Returns true if the message should be accepted (newer than last seen from this peer).
   * Updates local clock per Lamport algorithm: max(local, received) + 1
   *
   * @param peerId - The ID of the peer who sent the message
   * @param receivedClock - The clock value from the received message
   * @returns true if message is newer and should be processed, false if stale
   */
  receive(peerId: string, receivedClock: number): boolean {
    const lastClock = this.peerClocks.get(peerId) ?? 0

    // Reject stale messages
    if (receivedClock <= lastClock) {
      return false
    }

    // Update per Lamport: time = max(received, local) + 1
    this.localClock = Math.max(this.localClock, receivedClock) + 1
    this.peerClocks.set(peerId, receivedClock)

    return true
  }

  /**
   * Get the last seen clock value from a specific peer.
   */
  getLastSeenClock(peerId: string): number {
    return this.peerClocks.get(peerId) ?? 0
  }

  /**
   * Clear peer tracking (e.g., when leaving a channel).
   * Does not reset local clock to preserve monotonicity.
   */
  clearPeers(): void {
    this.peerClocks.clear()
  }

  /**
   * Reset the entire clock state (e.g., for testing).
   */
  reset(): void {
    this.localClock = 0
    this.peerClocks.clear()
  }
}
