import { useState } from 'react'
import type React from 'react'
import type { GameConfig, GameResult } from './types'
import { DeckLoader } from './components/DeckLoader'
import { GameScreen } from './components/GameScreen'
import { ResultScreen } from './components/ResultScreen'

type Screen = 'load' | 'game' | 'result'

export function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('load')
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)

  const handleStart = (cfg: GameConfig) => {
    setConfig(cfg)
    setScreen('game')
  }

  const handleComplete = (res: GameResult) => {
    setResult(res)
    setScreen('result')
  }

  const handleRestart = () => {
    setConfig(null)
    setResult(null)
    setScreen('load')
  }

  if (screen === 'game' && config) {
    return <GameScreen config={config} onComplete={handleComplete} />
  }

  if (screen === 'result' && result) {
    return <ResultScreen result={result} onRestart={handleRestart} />
  }

  return <DeckLoader onStart={handleStart} />
}
