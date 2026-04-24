import type { GameResult } from '../types'

interface Props {
  result: GameResult
  onRestart: () => void
}

export function ResultScreen(_props: Props): JSX.Element {
  throw new Error('not implemented')
}
