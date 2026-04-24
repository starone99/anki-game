import type { Card, InputMode } from './lib/input'

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface GameConfig {
  cards: Card[]
  sessionSize: number
  inputMode: InputMode
  difficulty: Difficulty
  hp?: number
}

export interface GameResult {
  score: number
  correctCount: number
  wrongCards: Card[]
}
