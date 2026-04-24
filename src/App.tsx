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

  const handleReviewWrong = () => {
    if (!config || !result || result.wrongCards.length === 0) return
    setConfig({
      ...config,
      cards: result.wrongCards,
      sessionSize: result.wrongCards.length,
    })
    setResult(null)
    setScreen('game')
  }

  if (screen === 'game' && config) {
    return <GameScreen config={config} onComplete={handleComplete} />
  }

  if (screen === 'result' && result) {
    return <ResultScreen result={result} onRestart={handleRestart} onReviewWrong={handleReviewWrong} />
  }

  return <DeckLoader onStart={handleStart} />
}
