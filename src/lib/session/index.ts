import type { Card } from '../input'

export interface SessionOptions {
  sessionSize: number
}

export interface Session {
  remaining: () => Card[]
  markCorrect: (card: Card) => void
  markWrong: (card: Card) => void
  reviewQueue: () => Card[]
  isComplete: () => boolean
}

export function createSession(cards: Card[], options: SessionOptions): Session {
  // Sort by due ascending, then take sessionSize
  const sorted = [...cards].sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
  const queue: Card[] = sorted.slice(0, options.sessionSize)
  const _reviewQueue: Card[] = []

  return {
    remaining: () => [...queue],
    markCorrect: (card: Card) => {
      const idx = queue.findIndex(c => c.word === card.word)
      if (idx !== -1) queue.splice(idx, 1)
    },
    markWrong: (card: Card) => {
      // Remove from current position
      const idx = queue.findIndex(c => c.word === card.word)
      if (idx === -1) return
      queue.splice(idx, 1)

      // Reinsert 3-5 positions later (random between 3 and 5)
      const offset = 3 + Math.floor(Math.random() * 3) // 3, 4, or 5
      const insertAt = Math.min(offset, queue.length)
      queue.splice(insertAt, 0, card)

      // Add to reviewQueue if not already present
      if (!_reviewQueue.find(c => c.word === card.word)) {
        _reviewQueue.push(card)
      }
    },
    reviewQueue: () => [..._reviewQueue],
    isComplete: () => queue.length === 0,
  }
}
