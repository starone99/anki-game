import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import type React from 'react'
import type { GameConfig, GameResult } from '../types'
import type { Card } from '../lib/input'
import { matchInput, isPrefixMatch, toRomaji, toKoreanPronunciation } from '../lib/input'
import { createSession } from '../lib/session'

interface Props {
  config: GameConfig
  onComplete: (result: GameResult) => void
}

const SLOT_COUNT: Record<string, number> = {
  easy: 2,
  normal: 4,
  hard: 6,
}

function getAnswer(card: Card, mode: GameConfig['inputMode']): string {
  switch (mode) {
    case 'romaji':
      return toRomaji(card.reading)
    case 'korean-pronunciation':
      return toKoreanPronunciation(card.reading)
    case 'hiragana':
      return card.reading
    case 'meaning':
      return card.meanings[0]
  }
}

export function GameScreen({ config, onComplete }: Props): React.JSX.Element {
  const { cards, sessionSize, inputMode, difficulty, hp: initialHp = 5 } = config

  const sessionRef = useRef(createSession(cards, { sessionSize }))
  const session = sessionRef.current

  const slotCount = SLOT_COUNT[difficulty] ?? 4

  const [visibleCards, setVisibleCards] = useState<Card[]>(() => {
    return session.remaining().slice(0, slotCount)
  })
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const [hp, setHp] = useState(initialHp)
  const [hintVisible, setHintVisible] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const gameOverRef = useRef(false)
  const hpRef = useRef(initialHp)
  const scoreRef = useRef(0)
  const correctCountRef = useRef(0)
  const wrongCardsRef = useRef<Card[]>([])
  const inputRef = useRef('')
  const visibleCardsRef = useRef<Card[]>(visibleCards)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const isComposingRef = useRef(false)

  // sync refs
  useEffect(() => { hpRef.current = hp }, [hp])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { correctCountRef.current = correctCount }, [correctCount])
  // wrongCardsRef tracks wrong cards directly
  useEffect(() => { inputRef.current = input }, [input])
  useEffect(() => { visibleCardsRef.current = visibleCards }, [visibleCards])

  const triggerComplete = useCallback(() => {
    if (gameOverRef.current) return
    gameOverRef.current = true
    setGameOver(true)
    onComplete({
      score: scoreRef.current,
      correctCount: correctCountRef.current,
      wrongCards: wrongCardsRef.current,
      totalCount: sessionSize,
    })
  }, [onComplete])

  // Keep hidden input focused
  useLayoutEffect(() => {
    if (!gameOver) hiddenInputRef.current?.focus()
  })

  const tryMatch = useCallback((newInput: string) => {
    const currentVisible = visibleCardsRef.current
    const matchedCard = currentVisible.find(card => matchInput(newInput, card, inputMode))
    if (matchedCard) {
      session.markCorrect(matchedCard)
      scoreRef.current += 1
      correctCountRef.current += 1
      setScore(s => s + 1)
      setCorrectCount(c => c + 1)
      setInput('')
      inputRef.current = ''
      if (hiddenInputRef.current) hiddenInputRef.current.value = ''
      const remaining = session.remaining()
      visibleCardsRef.current = remaining.slice(0, slotCount)
      setVisibleCards(remaining.slice(0, slotCount))
      if (session.isComplete()) {
        triggerComplete()
      }
    }
  }, [inputMode, session, slotCount, triggerComplete])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameOverRef.current) return

    if (e.key === 'Tab') {
      e.preventDefault()
      setHintVisible(v => !v)
      return
    }

    if (e.key === 'Enter') {
      const newHp = hpRef.current - 1
      hpRef.current = newHp
      setHp(newHp)
      setInput('')
      inputRef.current = ''
      if (hiddenInputRef.current) hiddenInputRef.current.value = ''
      if (newHp <= 0) triggerComplete()
      return
    }
  }, [triggerComplete])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameOverRef.current) return
    if (isComposingRef.current) return
    const newInput = e.target.value
    inputRef.current = newInput
    setInput(newInput)
    tryMatch(newInput)
  }, [tryMatch])

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false
    const newInput = (e.target as HTMLInputElement).value
    inputRef.current = newInput
    setInput(newInput)
    tryMatch(newInput)
  }, [tryMatch])

  const fallDuration = difficulty === 'easy' ? 12 : difficulty === 'hard' ? 6 : 9

  return (
    <div className="game-screen">
      {/* HUD */}
      <div className="game-hud">
        <div className="hud-block">
          <span className="hud-block__label">Score</span>
          <span className="hud-block__value" data-testid="score">{score}</span>
        </div>

        <div className="hud-block" style={{ alignItems: 'center' }}>
          <span className="hud-block__label">HP</span>
          <div
            className="hp-pips"
            data-testid="hp-bar"
            data-hp={String(hp)}
          >
            {Array.from({ length: initialHp }, (_, i) => (
              <div key={i} className={`hp-pip${i >= hp ? ' empty' : ''}`} />
            ))}
          </div>
        </div>

        <div className="hud-block" style={{ alignItems: 'flex-end' }}>
          <span className="hud-block__label">Remaining</span>
          <span className="hud-block__value" data-testid="card-count">{session.remaining().length}</span>
        </div>
      </div>

      {/* 게임 영역 */}
      <div className="game-area" data-testid="game-area">
        {visibleCards.map((card, i) => {
          const answer = getAnswer(card, inputMode)
          const highlighted = input.length > 0 && isPrefixMatch(input, card, inputMode)
          const leftPct = 5 + (i * (90 / Math.max(slotCount - 1, 1)))
          const delay = i * 0.4

          return (
            <div
              key={card.word}
              className={`falling-card${highlighted ? ' highlighted' : ''}`}
              data-testid="falling-card"
              data-word={card.word}
              data-answer={answer}
              data-highlighted={highlighted ? 'true' : 'false'}
              style={{
                left: `${leftPct}%`,
                animationDuration: `${fallDuration}s`,
                animationDelay: `${delay}s`,
              }}
            >
              <div className="falling-card__word">{card.word}</div>
              <div
                className="falling-card__hint"
                data-testid="reading-hint"
                data-visible={hintVisible ? 'true' : 'false'}
              >
                {card.reading}
              </div>
            </div>
          )
        })}
      </div>

      {/* 입력 HUD */}
      <div className="input-hud">
        <div className="input-display" data-testid="current-input">{input}</div>
        <span className="input-hint">Tab: 힌트 · Enter: 스킵</span>
      </div>

      {/* Hidden input captures all keyboard input including IME/Korean */}
      <input
        ref={hiddenInputRef}
        style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        onKeyDown={handleKeyDown}
        onChange={handleInputChange}
        onCompositionStart={() => { isComposingRef.current = true }}
        onCompositionEnd={handleCompositionEnd}
        aria-hidden="true"
      />
    </div>
  )
}
