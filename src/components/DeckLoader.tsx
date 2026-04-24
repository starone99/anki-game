import { useState } from 'react'
import type React from 'react'
import type { Card, InputMode } from '../lib/input'
import type { Difficulty, GameConfig } from '../types'
import { parseApkg } from '../lib/parser'

interface Props {
  onStart: (config: GameConfig) => void
}

const HIRAGANA_CARDS: Card[] = [
  { word: 'あ', reading: 'あ', meanings: ['아'] },
  { word: 'い', reading: 'い', meanings: ['이'] },
  { word: 'う', reading: 'う', meanings: ['우'] },
  { word: 'え', reading: 'え', meanings: ['에'] },
  { word: 'お', reading: 'お', meanings: ['오'] },
  { word: 'か', reading: 'か', meanings: ['카'] },
  { word: 'き', reading: 'き', meanings: ['키'] },
  { word: 'く', reading: 'く', meanings: ['쿠'] },
  { word: 'け', reading: 'け', meanings: ['케'] },
  { word: 'こ', reading: 'こ', meanings: ['코'] },
  { word: 'さ', reading: 'さ', meanings: ['사'] },
  { word: 'し', reading: 'し', meanings: ['시'] },
  { word: 'す', reading: 'す', meanings: ['스'] },
  { word: 'せ', reading: 'せ', meanings: ['세'] },
  { word: 'そ', reading: 'そ', meanings: ['소'] },
  { word: 'た', reading: 'た', meanings: ['타'] },
  { word: 'ち', reading: 'ち', meanings: ['치'] },
  { word: 'つ', reading: 'つ', meanings: ['츠'] },
  { word: 'て', reading: 'て', meanings: ['테'] },
  { word: 'と', reading: 'と', meanings: ['토'] },
  { word: 'な', reading: 'な', meanings: ['나'] },
  { word: 'に', reading: 'に', meanings: ['니'] },
  { word: 'ぬ', reading: 'ぬ', meanings: ['누'] },
  { word: 'ね', reading: 'ね', meanings: ['네'] },
  { word: 'の', reading: 'の', meanings: ['노'] },
  { word: 'は', reading: 'は', meanings: ['하'] },
  { word: 'ひ', reading: 'ひ', meanings: ['히'] },
  { word: 'ふ', reading: 'ふ', meanings: ['후'] },
  { word: 'へ', reading: 'へ', meanings: ['헤'] },
  { word: 'ほ', reading: 'ほ', meanings: ['호'] },
  { word: 'ま', reading: 'ま', meanings: ['마'] },
  { word: 'み', reading: 'み', meanings: ['미'] },
  { word: 'む', reading: 'む', meanings: ['무'] },
  { word: 'め', reading: 'め', meanings: ['메'] },
  { word: 'も', reading: 'も', meanings: ['모'] },
  { word: 'や', reading: 'や', meanings: ['야'] },
  { word: 'ゆ', reading: 'ゆ', meanings: ['유'] },
  { word: 'よ', reading: 'よ', meanings: ['요'] },
  { word: 'ら', reading: 'ら', meanings: ['라'] },
  { word: 'り', reading: 'り', meanings: ['리'] },
  { word: 'る', reading: 'る', meanings: ['루'] },
  { word: 'れ', reading: 'れ', meanings: ['레'] },
  { word: 'ろ', reading: 'ろ', meanings: ['로'] },
  { word: 'わ', reading: 'わ', meanings: ['와'] },
  { word: 'を', reading: 'を', meanings: ['오'] },
  { word: 'ん', reading: 'ん', meanings: ['응'] },
]

const KATAKANA_CARDS: Card[] = [
  { word: 'ア', reading: 'ア', meanings: ['아'] },
  { word: 'イ', reading: 'イ', meanings: ['이'] },
  { word: 'ウ', reading: 'ウ', meanings: ['우'] },
  { word: 'エ', reading: 'エ', meanings: ['에'] },
  { word: 'オ', reading: 'オ', meanings: ['오'] },
  { word: 'カ', reading: 'カ', meanings: ['카'] },
  { word: 'キ', reading: 'キ', meanings: ['키'] },
  { word: 'ク', reading: 'ク', meanings: ['쿠'] },
  { word: 'ケ', reading: 'ケ', meanings: ['케'] },
  { word: 'コ', reading: 'コ', meanings: ['코'] },
  { word: 'サ', reading: 'サ', meanings: ['사'] },
  { word: 'シ', reading: 'シ', meanings: ['시'] },
  { word: 'ス', reading: 'ス', meanings: ['스'] },
  { word: 'セ', reading: 'セ', meanings: ['세'] },
  { word: 'ソ', reading: 'ソ', meanings: ['소'] },
  { word: 'タ', reading: 'タ', meanings: ['타'] },
  { word: 'チ', reading: 'チ', meanings: ['치'] },
  { word: 'ツ', reading: 'ツ', meanings: ['츠'] },
  { word: 'テ', reading: 'テ', meanings: ['테'] },
  { word: 'ト', reading: 'ト', meanings: ['토'] },
  { word: 'ナ', reading: 'ナ', meanings: ['나'] },
  { word: 'ニ', reading: 'ニ', meanings: ['니'] },
  { word: 'ヌ', reading: 'ヌ', meanings: ['누'] },
  { word: 'ネ', reading: 'ネ', meanings: ['네'] },
  { word: 'ノ', reading: 'ノ', meanings: ['노'] },
  { word: 'ハ', reading: 'ハ', meanings: ['하'] },
  { word: 'ヒ', reading: 'ヒ', meanings: ['히'] },
  { word: 'フ', reading: 'フ', meanings: ['후'] },
  { word: 'ヘ', reading: 'ヘ', meanings: ['헤'] },
  { word: 'ホ', reading: 'ホ', meanings: ['호'] },
  { word: 'マ', reading: 'マ', meanings: ['마'] },
  { word: 'ミ', reading: 'ミ', meanings: ['미'] },
  { word: 'ム', reading: 'ム', meanings: ['무'] },
  { word: 'メ', reading: 'メ', meanings: ['메'] },
  { word: 'モ', reading: 'モ', meanings: ['모'] },
  { word: 'ヤ', reading: 'ヤ', meanings: ['야'] },
  { word: 'ユ', reading: 'ユ', meanings: ['유'] },
  { word: 'ヨ', reading: 'ヨ', meanings: ['요'] },
  { word: 'ラ', reading: 'ラ', meanings: ['라'] },
  { word: 'リ', reading: 'リ', meanings: ['리'] },
  { word: 'ル', reading: 'ル', meanings: ['루'] },
  { word: 'レ', reading: 'レ', meanings: ['레'] },
  { word: 'ロ', reading: 'ロ', meanings: ['로'] },
  { word: 'ワ', reading: 'ワ', meanings: ['와'] },
  { word: 'ヲ', reading: 'ヲ', meanings: ['오'] },
  { word: 'ン', reading: 'ン', meanings: ['응'] },
]

export function DeckLoader({ onStart }: Props): React.JSX.Element {
  const [cards, setCards] = useState<Card[] | null>(null)
  const [cardCount, setCardCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionSize, setSessionSize] = useState(20)
  const [inputMode, setInputMode] = useState<InputMode>('romaji')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setError(null)
    const file = e.dataTransfer.files[0]
    if (!file) return

    if (!file.name.endsWith('.apkg')) {
      setError('.apkg 파일만 지원합니다')
      return
    }

    const buffer = await file.arrayBuffer()
    const parsed = await parseApkg(buffer)
    setCards(parsed)
    setCardCount(parsed.length)
  }

  const handleBuiltinDeck = (deckCards: Card[]) => {
    setCards(deckCards)
    setCardCount(deckCards.length)
    setError(null)
  }

  const handleStart = () => {
    if (!cards) return
    onStart({ cards, sessionSize, inputMode, difficulty })
  }

  const inputModeOptions: { label: string; value: InputMode }[] = [
    { label: '로마자', value: 'romaji' },
    { label: '한국어 발음', value: 'korean-pronunciation' },
    { label: '히라가나', value: 'hiragana' },
    { label: '의미', value: 'meaning' },
  ]

  const difficultyOptions: { label: string; value: Difficulty }[] = [
    { label: '쉬움', value: 'easy' },
    { label: '보통', value: 'normal' },
    { label: '어려움', value: 'hard' },
  ]

  return (
    <div className="deck-loader">
      <div className="deck-loader__inner">
        <div className="deck-loader__title">
          <h1>ANKI RAIN</h1>
          <p>単語降雨ゲーム · Japanese Typing Game</p>
        </div>

        {/* Built-in deck buttons — rendered BEFORE input mode options */}
        <div className="deck-loader__section">
          <div className="deck-loader__label">내장 덱</div>
          <div className="deck-loader__builtin-btns">
            <button className={`btn${cards && cardCount === HIRAGANA_CARDS.length ? ' active' : ''}`} onClick={() => handleBuiltinDeck(HIRAGANA_CARDS)}>히라가나</button>
            <button className={`btn${cards && cardCount === KATAKANA_CARDS.length ? ' active' : ''}`} onClick={() => handleBuiltinDeck(KATAKANA_CARDS)}>가타카나</button>
            <button className="btn" onClick={() => handleBuiltinDeck([...HIRAGANA_CARDS, ...KATAKANA_CARDS])}>
              히라가나 + 가타카나
            </button>
          </div>
        </div>

        {/* Drop zone */}
        <div className="deck-loader__section">
          <div className="deck-loader__label">덱 파일 로드</div>
          <div
            className="dropzone"
            data-testid="dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="dropzone__icon">⬇</div>
            <div className="dropzone__text">.apkg 파일을 드래그하거나 클릭하세요</div>
            {cardCount !== null && <div className="dropzone__count">{cardCount}장 로드됨</div>}
            {error && <div className="dropzone__error">{error}</div>}
          </div>
        </div>

        {/* Input mode */}
        <div className="deck-loader__section">
          <div className="deck-loader__label">입력 모드</div>
          <div className="deck-loader__options">
            {inputModeOptions.map(({ label, value }) => (
              <button
                key={value}
                className={`btn${inputMode === value ? ' active' : ''}`}
                onClick={() => setInputMode(value)}
                aria-pressed={inputMode === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Session size slider */}
        <div className="deck-loader__section">
          <div className="deck-loader__label">세션 크기</div>
          <div className="slider-row">
            <label style={{ display: 'contents' }}>
              <span className="deck-loader__label" style={{ border: 'none', paddingBottom: 0 }}>세션 크기</span>
              <input
                type="range"
                aria-label="세션 크기"
                min={10}
                max={50}
                value={sessionSize}
                onChange={(e) => setSessionSize(Number(e.target.value))}
              />
            </label>
            <span className="slider-row__value">{sessionSize}</span>
          </div>
        </div>

        {/* Difficulty */}
        <div className="deck-loader__section">
          <div className="deck-loader__label">난이도</div>
          <div className="deck-loader__options">
            {difficultyOptions.map(({ label, value }) => (
              <button
                key={value}
                className={`btn${difficulty === value ? ' active' : ''}`}
                onClick={() => setDifficulty(value)}
                aria-pressed={difficulty === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <div className="deck-loader__start">
          <button className="btn-primary" onClick={handleStart} disabled={cards === null}>
            시작
          </button>
        </div>
      </div>
    </div>
  )
}
