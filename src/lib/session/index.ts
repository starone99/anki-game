import type { Card } from '../input'

export interface SessionOptions {
  sessionSize: number
  shuffle?: boolean
}

export interface Session {
  remaining: () => Card[]
  markCorrect: (card: Card) => void
  markWrong: (card: Card) => void
  reviewQueue: () => Card[]
  isComplete: () => boolean
}

function getCardKey(card: Card): string {
  return card.id ?? `${card.word}\u001f${card.reading}\u001f${card.meanings.join('\u001e')}`
}

export function createSession(cards: Card[], options: SessionOptions): Session {
  // Sort by due ascending, then take sessionSize
  const sorted = cards
    .map((card, index) => ({ ...card, id: card.id ?? `session-${index}` }))
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0))

  let arranged = sorted
  if (options.shuffle) {
    arranged = [...sorted]
    for (let i = arranged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arranged[i], arranged[j]] = [arranged[j], arranged[i]]
    }
  }

  const queue: Card[] = arranged.slice(0, options.sessionSize)
  const _reviewQueue: Card[] = []

  return {
    remaining: () => [...queue],
    markCorrect: (card: Card) => {
      const key = getCardKey(card)
      const idx = queue.findIndex(c => getCardKey(c) === key)
      if (idx !== -1) queue.splice(idx, 1)
    },
    markWrong: (card: Card) => {
      // Remove from current position
      const key = getCardKey(card)
      const idx = queue.findIndex(c => getCardKey(c) === key)
      if (idx === -1) return
      queue.splice(idx, 1)

      // Reinsert 3-5 positions later (random between 3 and 5)
      const offset = 3 + Math.floor(Math.random() * 3) // 3, 4, or 5
      const insertAt = Math.min(offset, queue.length)
      queue.splice(insertAt, 0, card)

      // Add to reviewQueue if not already present
      if (!_reviewQueue.find(c => getCardKey(c) === key)) {
        _reviewQueue.push(card)
      }
    },
    reviewQueue: () => [..._reviewQueue],
    isComplete: () => queue.length === 0,
  }
}
