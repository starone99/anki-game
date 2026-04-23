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

export function createSession(_cards: Card[], _options: SessionOptions): Session {
  throw new Error('not implemented')
}
