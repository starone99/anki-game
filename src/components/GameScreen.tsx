import type { GameConfig, GameResult } from '../types'

interface Props {
  config: GameConfig
  onComplete: (result: GameResult) => void
}

export function GameScreen(_props: Props): JSX.Element {
  throw new Error('not implemented')
}
