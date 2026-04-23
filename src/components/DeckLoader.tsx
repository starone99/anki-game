import type { GameConfig } from '../types'

interface Props {
  onStart: (config: GameConfig) => void
}

export function DeckLoader(_props: Props): JSX.Element {
  throw new Error('not implemented')
}
