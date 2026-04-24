import type { Card, InputMode } from './lib/input'

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface GameConfig {
  cards: Card[]
  sessionSize: number
  inputMode: InputMode
  difficulty: Difficulty
  shuffle: boolean
  hp?: number
}

export interface GameResult {
  score: number
  correctCount: number
  wrongCards: Card[]
  totalCount: number
}
