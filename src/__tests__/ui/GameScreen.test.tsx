// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameScreen } from '../../components/GameScreen'
import type { GameConfig } from '../../types'

const makeConfig = (overrides?: Partial<GameConfig>): GameConfig => ({
  cards: [
    { word: '食べる', reading: 'たべる', meanings: ['먹다'] },
    { word: '飲む', reading: 'のむ', meanings: ['마시다'] },
    { word: '見る', reading: 'みる', meanings: ['보다'] },
    { word: '行く', reading: 'いく', meanings: ['가다'] },
    { word: '来る', reading: 'くる', meanings: ['오다'] },
  ],
  sessionSize: 5,
  inputMode: 'romaji',
  difficulty: 'normal',
  ...overrides,
})

// ── 렌더링 ──

describe('GameScreen — 렌더링', () => {
  it('HP바가 렌더링된다', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    expect(screen.getByTestId('hp-bar')).toBeInTheDocument()
  })

  it('점수가 0으로 시작한다', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    expect(screen.getByTestId('score')).toHaveTextContent('0')
  })

  it('남은 카드 수가 표시된다', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    expect(screen.getByTestId('card-count')).toBeInTheDocument()
  })

  it('게임 영역이 렌더링된다', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    expect(screen.getByTestId('game-area')).toBeInTheDocument()
  })

  it('단어 카드가 화면에 표시된다', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    const cards = screen.getAllByTestId('falling-card')
    expect(cards.length).toBeGreaterThan(0)
  })
})

// ── 난이도별 동시 단어 수 ──

describe('GameScreen — 난이도', () => {
  it('쉬움: 동시 2개 표시', () => {
    render(<GameScreen config={makeConfig({ difficulty: 'easy' })} onComplete={vi.fn()} />)
    expect(screen.getAllByTestId('falling-card').length).toBe(2)
  })

  it('보통: 동시 4개 표시', () => {
    render(<GameScreen config={makeConfig({ difficulty: 'normal' })} onComplete={vi.fn()} />)
    expect(screen.getAllByTestId('falling-card').length).toBe(4)
  })

  it('어려움: 동시 6개 표시 (카드가 6개 미만이면 전부)', () => {
    render(<GameScreen config={makeConfig({ difficulty: 'hard' })} onComplete={vi.fn()} />)
    const count = screen.getAllByTestId('falling-card').length
    expect(count).toBeLessThanOrEqual(6)
    expect(count).toBeGreaterThan(0)
  })
})

// ── HP ──

describe('GameScreen — HP', () => {
  it('기본 HP가 5로 시작한다', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    expect(screen.getByTestId('hp-bar')).toHaveAttribute('data-hp', '5')
  })

  it('설정된 HP로 시작한다', () => {
    render(<GameScreen config={makeConfig({ hp: 3 } as GameConfig)} onComplete={vi.fn()} />)
    expect(screen.getByTestId('hp-bar')).toHaveAttribute('data-hp', '3')
  })
})

// ── 타이핑 입력 ──

describe('GameScreen — 타이핑 입력', () => {
  it('정답 입력 시 점수가 올라간다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    const scoreEl = screen.getByTestId('score')
    const initialScore = Number(scoreEl.textContent)

    // 로마자 모드, 첫 번째 보이는 단어의 정답 입력
    const firstCard = screen.getAllByTestId('falling-card')[0]
    const word = firstCard.getAttribute('data-word')!
    const answer = firstCard.getAttribute('data-answer')!

    await user.keyboard(answer)

    expect(Number(screen.getByTestId('score').textContent)).toBeGreaterThan(initialScore)
    // 정답 카드는 화면에서 제거됨
    expect(screen.queryAllByTestId('falling-card').find(c => c.getAttribute('data-word') === word)).toBeUndefined()
  })

  it('오답 입력 후 Enter 시 HP가 감소한다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    const initialHp = Number(screen.getByTestId('hp-bar').getAttribute('data-hp'))

    await user.keyboard('zzzzzzzzz{Enter}')

    expect(Number(screen.getByTestId('hp-bar').getAttribute('data-hp'))).toBeLessThan(initialHp)
  })

  it('현재 입력 중인 텍스트가 표시된다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    await user.keyboard('tab')

    expect(screen.getByTestId('current-input')).toHaveTextContent('tab')
  })

  it('정답 후 입력창이 초기화된다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    const firstCard = screen.getAllByTestId('falling-card')[0]
    const answer = firstCard.getAttribute('data-answer')!

    await user.keyboard(answer)

    expect(screen.getByTestId('current-input')).toHaveTextContent('')
  })
})

// ── 하이라이트 ──

describe('GameScreen — 하이라이트', () => {
  it('접두사 일치 시 해당 카드가 하이라이트된다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    // 첫 번째 카드의 answer 앞 2글자 입력
    const firstCard = screen.getAllByTestId('falling-card')[0]
    const answer = firstCard.getAttribute('data-answer')!
    const prefix = answer.slice(0, 2)

    await user.keyboard(prefix)

    const highlighted = screen.getAllByTestId('falling-card').filter(
      c => c.getAttribute('data-highlighted') === 'true'
    )
    expect(highlighted.length).toBeGreaterThan(0)
  })

  it('아무것도 입력 안 했을 때 하이라이트 없음', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    const highlighted = screen.getAllByTestId('falling-card').filter(
      c => c.getAttribute('data-highlighted') === 'true'
    )
    expect(highlighted.length).toBe(0)
  })
})

// ── 힌트 토글 ──

describe('GameScreen — 힌트 토글', () => {
  it('기본적으로 히라가나 힌트가 숨겨져 있다', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    const hints = screen.queryAllByTestId('reading-hint')
    hints.forEach(hint => {
      expect(hint).toHaveAttribute('data-visible', 'false')
    })
  })

  it('Tab 키로 힌트를 토글한다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    await user.keyboard('{Tab}')

    const hints = screen.queryAllByTestId('reading-hint')
    hints.forEach(hint => {
      expect(hint).toHaveAttribute('data-visible', 'true')
    })
  })

  it('Tab 키를 두 번 누르면 다시 숨겨진다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    await user.keyboard('{Tab}{Tab}')

    const hints = screen.queryAllByTestId('reading-hint')
    hints.forEach(hint => {
      expect(hint).toHaveAttribute('data-visible', 'false')
    })
  })
})

// ── 게임 종료 ──

describe('GameScreen — 게임 종료', () => {
  it('HP가 0이 되면 onComplete가 호출된다', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<GameScreen config={makeConfig({ hp: 1 } as GameConfig)} onComplete={onComplete} />)

    // 오답 5번 입력해서 HP 소진
    for (let i = 0; i < 5; i++) {
      await user.keyboard('zzzzz{Enter}')
    }

    expect(onComplete).toHaveBeenCalled()
  })

  it('onComplete 호출 시 GameResult가 전달된다', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<GameScreen config={makeConfig({ hp: 1 } as GameConfig)} onComplete={onComplete} />)

    for (let i = 0; i < 5; i++) {
      await user.keyboard('zzzzz{Enter}')
    }

    if (onComplete.mock.calls.length > 0) {
      const result = onComplete.mock.calls[0][0]
      expect(result).toMatchObject({
        score: expect.any(Number),
        correctCount: expect.any(Number),
        wrongCards: expect.any(Array),
      })
    }
  })
})
