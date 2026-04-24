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
  const [answerFlash, setAnswerFlash] = useState(false)
  const [gameOverOverlay, setGameOverOverlay] = useState(false)

  const gameOverRef = useRef(false)
  const hpRef = useRef(initialHp)
  const scoreRef = useRef(0)
  const correctCountRef = useRef(0)
  const wrongCardsRef = useRef<Card[]>([])
  const inputRef = useRef('')
  const visibleCardsRef = useRef<Card[]>(visibleCards)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const isComposingRef = useRef(false)

  const resetInput = useCallback(() => {
    setInput('')
    inputRef.current = ''
    if (hiddenInputRef.current) hiddenInputRef.current.value = ''
  }, [])

  const focusInput = useCallback(() => {
    if (!gameOverRef.current) hiddenInputRef.current?.focus()
  }, [])

  // sync refs
  useEffect(() => { hpRef.current = hp }, [hp])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { correctCountRef.current = correctCount }, [correctCount])
  // wrongCardsRef tracks wrong cards directly
  useEffect(() => { inputRef.current = input }, [input])
  useEffect(() => { visibleCardsRef.current = visibleCards }, [visibleCards])

  const triggerComplete = useCallback((isGameOver = false) => {
    if (gameOverRef.current) return
    gameOverRef.current = true
    setGameOver(true)
    const result = {
      score: scoreRef.current,
      correctCount: correctCountRef.current,
      wrongCards: wrongCardsRef.current,
      totalCount: sessionSize,
    }
    if (isGameOver) {
      setGameOverOverlay(true)
      setTimeout(() => {
        setGameOverOverlay(false)
        onComplete(result)
      }, 1200)
    } else {
      onComplete(result)
    }
  }, [onComplete, sessionSize])

  // Keep hidden input focused
  useLayoutEffect(() => {
    focusInput()
  }, [focusInput, gameOver])

  useEffect(() => {
    window.addEventListener('pointerdown', focusInput)
    window.addEventListener('focus', focusInput)
    return () => {
      window.removeEventListener('pointerdown', focusInput)
      window.removeEventListener('focus', focusInput)
    }
  }, [focusInput])

  const tryMatch = useCallback((newInput: string) => {
    const currentVisible = visibleCardsRef.current
    const matchedCard = currentVisible.find(card => matchInput(newInput, card, inputMode))
    if (matchedCard) {
      session.markCorrect(matchedCard)
      scoreRef.current += 1
      correctCountRef.current += 1
      setScore(s => s + 1)
      setCorrectCount(c => c + 1)
      resetInput()
      const remaining = session.remaining()
      visibleCardsRef.current = remaining.slice(0, slotCount)
      setVisibleCards(remaining.slice(0, slotCount))
      setAnswerFlash(true)
      setTimeout(() => setAnswerFlash(false), 180)
      if (session.isComplete()) {
        triggerComplete(false)
      }
    }
  }, [inputMode, resetInput, session, slotCount, triggerComplete])

  const handleMissedCard = useCallback((card?: Card) => {
    if (gameOverRef.current) return
    if (!card || !session.remaining().some(c => c.word === card.word)) return

    session.markWrong(card)
    wrongCardsRef.current = session.reviewQueue()

    const newHp = hpRef.current - 1
    hpRef.current = newHp
    setHp(newHp)
    resetInput()

    const remaining = session.remaining()
    visibleCardsRef.current = remaining.slice(0, slotCount)
    setVisibleCards(remaining.slice(0, slotCount))

    if (newHp <= 0) triggerComplete(true)
  }, [resetInput, session, slotCount, triggerComplete])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameOverRef.current) return

    if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      setHintVisible(v => !v)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleMissedCard(visibleCardsRef.current[0])
      return
    }
  }, [handleMissedCard])

  const handleGlobalKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameOverRef.current) return
    focusInput()

    if (e.key === 'Tab') {
      e.preventDefault()
      setHintVisible(v => !v)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      handleMissedCard(visibleCardsRef.current[0])
      return
    }

    if (
      e.target !== hiddenInputRef.current &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !isComposingRef.current
    ) {
      const newInput = inputRef.current + e.key
      if (hiddenInputRef.current) hiddenInputRef.current.value = newInput
      inputRef.current = newInput
      setInput(newInput)
      tryMatch(newInput)
    }
  }, [focusInput, handleMissedCard, tryMatch])

  const handleCardFall = useCallback((card: Card) => {
    handleMissedCard(card)
  }, [handleMissedCard])

  const handleInputValue = useCallback((newInput: string) => {
    if (gameOverRef.current) return
    inputRef.current = newInput
    setInput(newInput)
    tryMatch(newInput)
  }, [tryMatch])

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    handleInputValue(e.currentTarget.value)
  }, [handleInputValue])

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false
    handleInputValue(e.currentTarget.value)
  }, [handleInputValue])

  const fallDuration = difficulty === 'easy' ? 12 : difficulty === 'hard' ? 6 : 9
  const dangerThreshold = 0.75
  const inputError = input.length > 0 && !visibleCards.some(card => isPrefixMatch(input, card, inputMode))

  return (
    <div className="game-screen" tabIndex={-1} onKeyDown={handleGlobalKeyDown}>
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
                animationName: 'fall',
                animationDuration: `${fallDuration}s`,
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards',
                animationDelay: `${delay}s`,
              }}
              onAnimationEnd={(e) => {
                if (e.currentTarget === e.target && e.animationName === 'fall') {
                  handleCardFall(card)
                }
              }}
            >
              <div
                className="falling-card__word"
                style={{
                  animationName: 'card-spawn, card-danger',
                  animationDuration: `0.3s, ${fallDuration * (1 - dangerThreshold) * 0.5}s`,
                  animationTimingFunction: 'ease-out, ease-in-out',
                  animationDelay: `0s, ${delay + fallDuration * dangerThreshold}s`,
                  animationIterationCount: '1, infinite',
                }}
              >
                {card.word}
              </div>
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

      {/* 정답 플래시 */}
      {answerFlash && <div className="answer-flash" />}

      {/* 게임오버 오버레이 */}
      {gameOverOverlay && (
        <div className="game-over-overlay">
          <span className="game-over-text">GAME OVER</span>
        </div>
      )}

      {/* 입력 HUD */}
      <div className="input-hud">
        <div className="input-display" data-testid="current-input" data-error={inputError ? 'true' : 'false'}>{input}</div>
        <span className="input-hint">Tab: 힌트 · Enter: 스킵</span>
      </div>

      {/* Hidden input captures all keyboard input including IME/Korean */}
      <input
        ref={hiddenInputRef}
        autoFocus
        className="game-keyboard-input"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onCompositionStart={() => { isComposingRef.current = true }}
        onCompositionEnd={handleCompositionEnd}
        aria-label="Game input"
      />
    </div>
  )
}
