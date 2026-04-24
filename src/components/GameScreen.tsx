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

function getCardKey(card: Card): string {
  return card.id ?? `${card.word}\u001f${card.reading}\u001f${card.meanings.join('\u001e')}`
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

  const sessionRef = useRef(createSession(cards, { sessionSize, shuffle: config.shuffle }))
  const session = sessionRef.current

  const slotCount = SLOT_COUNT[difficulty] ?? 4

  const [visibleCards, setVisibleCards] = useState<Card[]>(() => {
    return session.remaining().slice(0, slotCount)
  })
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [missedCount, setMissedCount] = useState(0)

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
  const ignoredFallKeysRef = useRef<Set<string>>(new Set())
  const lastCorrectAtRef = useRef(0)
  const fallTimersRef = useRef<Map<string, number>>(new Map())
  const submitTimerRef = useRef<number | null>(null)
  const pendingSubmitRef = useRef(false)
  const cardLeftRef = useRef<Map<string, number>>(new Map())

  const resetInput = useCallback(() => {
    setInput('')
    inputRef.current = ''
    if (hiddenInputRef.current) hiddenInputRef.current.value = ''
  }, [])

  const focusInput = useCallback(() => {
    if (!gameOverRef.current) hiddenInputRef.current?.focus()
  }, [])

  const clearFallTimer = useCallback((card: Card) => {
    const cardKey = getCardKey(card)
    const timer = fallTimersRef.current.get(cardKey)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      fallTimersRef.current.delete(cardKey)
    }
  }, [])

  const replaceVisibleCard = useCallback((removedCard: Card) => {
    const removedKey = getCardKey(removedCard)
    const currentVisible = visibleCardsRef.current
    const keptKeys = new Set(
      currentVisible
        .filter(card => getCardKey(card) !== removedKey)
        .map(getCardKey),
    )
    const replacement = session.remaining().find(card => !keptKeys.has(getCardKey(card)))
    const nextVisible = currentVisible
      .map(card => getCardKey(card) === removedKey ? replacement : card)
      .filter((card): card is Card => Boolean(card))

    visibleCardsRef.current = nextVisible
    setVisibleCards(nextVisible)
  }, [session])

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

  const tryMatch = useCallback((newInput: string): boolean => {
    const currentVisible = visibleCardsRef.current
    const matchedCard = currentVisible.find(card => matchInput(newInput, card, inputMode))
    if (matchedCard) {
      ignoredFallKeysRef.current.add(getCardKey(matchedCard))
      lastCorrectAtRef.current = Date.now()
      clearFallTimer(matchedCard)
      session.markCorrect(matchedCard)
      scoreRef.current += 1
      correctCountRef.current += 1
      setScore(s => s + 1)
      setCorrectCount(c => c + 1)
      resetInput()
      replaceVisibleCard(matchedCard)
      setAnswerFlash(true)
      setTimeout(() => setAnswerFlash(false), 180)
      if (session.isComplete()) {
        triggerComplete(false)
      }
      return true
    }
    return false
  }, [clearFallTimer, inputMode, replaceVisibleCard, resetInput, session, triggerComplete])

  const clearSubmitTimer = useCallback(() => {
    if (submitTimerRef.current !== null) {
      window.clearTimeout(submitTimerRef.current)
      submitTimerRef.current = null
    }
  }, [])

  const submitInput = useCallback((liveInput?: string) => {
    const nextInput = liveInput ?? hiddenInputRef.current?.value ?? inputRef.current
    if (nextInput.length === 0) return

    if (!tryMatch(nextInput)) {
      resetInput()
    }
  }, [resetInput, tryMatch])

  const handleMissedCard = useCallback((card?: Card) => {
    if (gameOverRef.current) return
    if (!card) return

    const cardKey = getCardKey(card)
    if (ignoredFallKeysRef.current.has(cardKey)) return
    if (Date.now() - lastCorrectAtRef.current < 250) return
    if (!session.remaining().some(c => getCardKey(c) === cardKey)) return

    clearFallTimer(card)
    session.markWrong(card)
    wrongCardsRef.current = session.reviewQueue()
    setMissedCount(wrongCardsRef.current.length)

    const newHp = hpRef.current - 1
    hpRef.current = newHp
    setHp(newHp)

    replaceVisibleCard(card)

    if (newHp <= 0) triggerComplete(true)
  }, [clearFallTimer, replaceVisibleCard, session, triggerComplete])

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
      submitInput(e.currentTarget.value)
      return
    }
  }, [submitInput])

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (gameOverRef.current) return
    if (e.key !== 'Enter') return
    if (isComposingRef.current || (e.nativeEvent as KeyboardEvent).isComposing) return
    submitInput(e.currentTarget.value)
  }, [submitInput])

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (gameOverRef.current) return
    if (isComposingRef.current) {
      pendingSubmitRef.current = true
      return
    }
    submitInput()
  }, [submitInput])

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
      if (isComposingRef.current || (e.nativeEvent as KeyboardEvent).isComposing) {
        pendingSubmitRef.current = true
        return
      }
      submitInput()
      return
    }

    if (e.key === 'Backspace' && e.target !== hiddenInputRef.current) {
      e.preventDefault()
      const newInput = inputRef.current.slice(0, -1)
      if (hiddenInputRef.current) hiddenInputRef.current.value = newInput
      inputRef.current = newInput
      setInput(newInput)
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      resetInput()
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
    }
  }, [focusInput, resetInput, submitInput])

  const handleGlobalKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (gameOverRef.current) return
    if (e.key !== 'Enter') return
    if (isComposingRef.current || (e.nativeEvent as KeyboardEvent).isComposing) return
    submitInput()
  }, [submitInput])

  const handleCardFall = useCallback((card: Card) => {
    handleMissedCard(card)
  }, [handleMissedCard])

  const handleInputValue = useCallback((newInput: string) => {
    if (gameOverRef.current) return
    inputRef.current = newInput
    setInput(newInput)
  }, [])

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    handleInputValue(e.currentTarget.value)
  }, [handleInputValue])

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    const committedValue = e.currentTarget.value
    isComposingRef.current = false
    handleInputValue(committedValue)
    if (pendingSubmitRef.current) {
      pendingSubmitRef.current = false
      clearSubmitTimer()
      submitTimerRef.current = window.setTimeout(() => {
        submitTimerRef.current = null
        if (!gameOverRef.current) {
          submitInput(committedValue)
        }
      }, 0)
    }
  }, [clearSubmitTimer, handleInputValue, submitInput])

  const fallDuration = difficulty === 'easy' ? 12 : difficulty === 'hard' ? 6 : 9
  const dangerThreshold = 0.75
  const inputError = input.length > 0 && !visibleCards.some(card => isPrefixMatch(input, card, inputMode))

  useEffect(() => {
    visibleCards.forEach((card, i) => {
      const cardKey = getCardKey(card)
      if (fallTimersRef.current.has(cardKey)) return

      const delay = i * 0.4
      const timer = window.setTimeout(() => {
        fallTimersRef.current.delete(cardKey)
        handleCardFall(card)
      }, (delay + fallDuration) * 1000)
      fallTimersRef.current.set(cardKey, timer)
    })
  }, [fallDuration, handleCardFall, visibleCards])

  useEffect(() => {
    return () => {
      clearSubmitTimer()
      fallTimersRef.current.forEach(timer => window.clearTimeout(timer))
      fallTimersRef.current.clear()
    }
  }, [clearSubmitTimer])

  return (
    <div className="game-screen" tabIndex={-1} onKeyDown={handleGlobalKeyDown} onKeyUp={handleGlobalKeyUp}>
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
          <span className="hud-block__label">Queue</span>
          <span className="hud-block__value" data-testid="card-count">{session.remaining().length}</span>
          <span className="hud-block__label" data-testid="missed-count">Missed {missedCount}</span>
        </div>
      </div>

      {/* 게임 영역 */}
      <div className="game-area" data-testid="game-area">
        <div className="danger-zone" aria-hidden="true" />
        {visibleCards.map((card, i) => {
          const answer = getAnswer(card, inputMode)
          const highlighted = input.length > 0 && isPrefixMatch(input, card, inputMode)
          const cardKey = getCardKey(card)
          // slotCount가 많을수록 확보 가능한 최소 간격이 줄어듦. 2~4슬롯은 15% 유지, 6슬롯은 ~11%.
          const MIN_GAP = Math.min(15, Math.max(10, Math.floor(90 / (slotCount * 1.3))))
          let leftPct = cardLeftRef.current.get(cardKey)
          if (leftPct === undefined) {
            const others = visibleCards
              .filter(c => getCardKey(c) !== cardKey)
              .map(c => cardLeftRef.current.get(getCardKey(c)))
              .filter((v): v is number => v !== undefined)
            const minDistTo = (pos: number) =>
              others.length ? Math.min(...others.map(o => Math.abs(o - pos))) : Infinity
            let best = 5 + Math.random() * 90
            let bestDist = minDistTo(best)
            for (let attempt = 1; attempt < 20 && bestDist < MIN_GAP; attempt++) {
              const cand = 5 + Math.random() * 90
              const dist = minDistTo(cand)
              if (dist > bestDist) {
                best = cand
                bestDist = dist
              }
            }
            leftPct = best
            cardLeftRef.current.set(cardKey, leftPct)
          }
          const delay = i * 0.4

          return (
            <div
              key={getCardKey(card)}
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
              onAnimationEnd={() => handleCardFall(card)}
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
                onAnimationEnd={(e) => e.stopPropagation()}
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
        <span className="input-hint">Tab: 힌트 · Enter: 제출</span>
      </div>

      {/* Hidden input captures all keyboard input including IME/Korean */}
      <form className="game-input-form" onSubmit={handleSubmit}>
        <input
          ref={hiddenInputRef}
          autoFocus
          className="game-keyboard-input"
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onInput={handleInput}
          onCompositionStart={() => { isComposingRef.current = true }}
          onCompositionEnd={handleCompositionEnd}
          aria-label="Game input"
        />
      </form>
    </div>
  )
}
