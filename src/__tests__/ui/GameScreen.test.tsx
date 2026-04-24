// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
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

afterEach(() => {
  vi.useRealTimers()
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

    await user.keyboard(`${answer}{Enter}`)

    expect(Number(screen.getByTestId('score').textContent)).toBeGreaterThan(initialScore)
    // 정답 카드는 화면에서 제거됨
    expect(screen.queryAllByTestId('falling-card').find(c => c.getAttribute('data-word') === word)).toBeUndefined()
  })

  it('입력이 비어 있을 때 Enter는 아무 동작도 하지 않는다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    const initialHp = screen.getByTestId('hp-bar').getAttribute('data-hp')
    const initialCount = screen.getByTestId('card-count').textContent

    const card = screen.getAllByTestId('falling-card')[0]
    act(() => {
      card.dispatchEvent(new Event('animationend', { bubbles: true }))
    })

    expect(screen.getByTestId('hp-bar')).toHaveAttribute('data-hp', initialHp)
    expect(screen.getByTestId('card-count')).toHaveTextContent(initialCount ?? '')
  })

  it('정답 입력 후 Enter는 HP를 깎지 않는다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    const initialHp = screen.getByTestId('hp-bar').getAttribute('data-hp')
    const firstCard = screen.getAllByTestId('falling-card')[0]
    const answer = firstCard.getAttribute('data-answer')!

    await user.keyboard(`${answer}{Enter}`)

    expect(screen.getByTestId('hp-bar')).toHaveAttribute('data-hp', initialHp)
  })

  it('정답 카드가 사라져도 다른 카드의 lane은 유지된다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    const cards = screen.getAllByTestId('falling-card')
    const secondWord = cards[1].getAttribute('data-word')
    const secondLeft = cards[1].style.left
    const answer = cards[0].getAttribute('data-answer')!

    await user.keyboard(`${answer}{Enter}`)

    const sameSecondCard = screen
      .getAllByTestId('falling-card')
      .find(card => card.getAttribute('data-word') === secondWord)
    expect(sameSecondCard).toHaveStyle({ left: secondLeft })
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

    await user.keyboard(`${answer}{Enter}`)

    expect(screen.getByTestId('current-input')).toHaveTextContent('')
  })

  it('한글 IME 조합 중인 입력도 정답으로 처리한다', () => {
    render(
      <GameScreen
        config={makeConfig({
          cards: [
            { word: '食べる', reading: 'たべる', meanings: ['먹다'] },
            { word: '飲む', reading: 'のむ', meanings: ['마시다'] },
          ],
          sessionSize: 2,
          inputMode: 'meaning',
        })}
        onComplete={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Game input')
    fireEvent.compositionStart(input)
    fireEvent.input(input, { target: { value: '먹다' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyUp(input, { key: 'Enter' })

    expect(screen.getByTestId('score')).toHaveTextContent('1')
    expect(screen.getByTestId('current-input')).toHaveTextContent('')
  })

  it('submits the live input value on Enter even before React state catches up', () => {
    render(
      <GameScreen
        config={makeConfig({
          cards: [
            { word: 'taberu', reading: 'taberu', meanings: ['eat'] },
            { word: 'miru', reading: 'miru', meanings: ['see'] },
          ],
          sessionSize: 2,
          inputMode: 'meaning',
        })}
        onComplete={vi.fn()}
    />,
    )

    const input = screen.getByLabelText('Game input') as HTMLInputElement
    input.value = 'eat'
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByTestId('score')).toHaveTextContent('1')
    expect(screen.getByTestId('current-input')).toHaveTextContent('')
  })

  it('submits through the form submit path', () => {
    render(
      <GameScreen
        config={makeConfig({
          cards: [
            { word: 'taberu', reading: 'taberu', meanings: ['eat'] },
            { word: 'miru', reading: 'miru', meanings: ['see'] },
          ],
          sessionSize: 2,
          inputMode: 'meaning',
        })}
        onComplete={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Game input') as HTMLInputElement
    const form = input.closest('form')
    input.value = 'eat'

    expect(form).not.toBeNull()
    fireEvent.submit(form!)

    expect(screen.getByTestId('score')).toHaveTextContent('1')
    expect(screen.getByTestId('current-input')).toHaveTextContent('')
  })

  it('submits on Enter keyup when keydown path is unavailable', () => {
    render(
      <GameScreen
        config={makeConfig({
          cards: [
            { word: 'taberu', reading: 'taberu', meanings: ['eat'] },
            { word: 'miru', reading: 'miru', meanings: ['see'] },
          ],
          sessionSize: 2,
          inputMode: 'meaning',
        })}
        onComplete={vi.fn()}
      />,
    )

    const screenRoot = document.querySelector('.game-screen') as HTMLElement
    const input = screen.getByLabelText('Game input') as HTMLInputElement
    input.value = 'eat'

    fireEvent.keyUp(screenRoot, { key: 'Enter' })

    expect(screen.getByTestId('score')).toHaveTextContent('1')
    expect(screen.getByTestId('current-input')).toHaveTextContent('')
  })

  it('submits after composition ends when Enter is pressed during IME input', () => {
    vi.useFakeTimers()
    render(
      <GameScreen
        config={makeConfig({
          cards: [
            { word: 'taberu', reading: 'taberu', meanings: ['eat'] },
            { word: 'miru', reading: 'miru', meanings: ['see'] },
          ],
          sessionSize: 2,
          inputMode: 'meaning',
        })}
        onComplete={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Game input')
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(screen.getByTestId('score')).toHaveTextContent('0')

    fireEvent.compositionEnd(input, { target: { value: 'eat' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyUp(input, { key: 'Enter' })
    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(screen.getByTestId('score')).toHaveTextContent('1')
    expect(screen.getByTestId('current-input')).toHaveTextContent('')
    vi.useRealTimers()
  })

  it('Backspace works when focus is on the game screen fallback handler', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    const gameScreen = document.querySelector('.game-screen') as HTMLElement
    gameScreen.focus()

    fireEvent.keyDown(gameScreen, { key: 'a' })
    fireEvent.keyDown(gameScreen, { key: 'b' })
    fireEvent.keyDown(gameScreen, { key: 'Backspace' })

    expect(screen.getByTestId('current-input')).toHaveTextContent('a')
  })

  it('정답 처리된 카드의 늦은 낙하 종료 이벤트는 HP를 깎지 않는다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    const initialHp = screen.getByTestId('hp-bar').getAttribute('data-hp')
    const firstCard = screen.getAllByTestId('falling-card')[0]
    const answer = firstCard.getAttribute('data-answer')!

    await user.keyboard(`${answer}{Enter}`)
    fireEvent.animationEnd(firstCard, { animationName: 'fall' })

    expect(screen.getByTestId('hp-bar')).toHaveAttribute('data-hp', initialHp)
  })

  it('정답 직후 같은 순간에 도착한 다른 카드 낙하 종료는 HP를 깎지 않는다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    const initialHp = screen.getByTestId('hp-bar').getAttribute('data-hp')
    const cards = screen.getAllByTestId('falling-card')
    const answer = cards[0].getAttribute('data-answer')!

    await user.keyboard(answer)
    fireEvent.animationEnd(cards[1], { animationName: 'fall' })

    expect(screen.getByTestId('hp-bar')).toHaveAttribute('data-hp', initialHp)
  })

  it('매칭 안 되는 입력 후 Enter는 입력창을 비운다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    // 어떤 카드와도 매칭 안 되는 문자열
    await user.keyboard('zzzzz{Enter}')

    // 입력 표시가 비어 있어야 함
    expect(screen.getByTestId('current-input')).toHaveTextContent('')
  })

  it('매칭 안 되는 입력 후 Enter는 HP를 깎지 않는다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

    const initialHp = screen.getByTestId('hp-bar').getAttribute('data-hp')
    await user.keyboard('zzzzz{Enter}')
    expect(screen.getByTestId('hp-bar')).toHaveAttribute('data-hp', initialHp)
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
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<GameScreen config={makeConfig({ hp: 1 } as GameConfig)} onComplete={onComplete} />)

    act(() => {
      vi.advanceTimersByTime(11000)
    })
    expect(onComplete).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('onComplete 호출 시 GameResult가 전달된다', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<GameScreen config={makeConfig({ hp: 1 } as GameConfig)} onComplete={onComplete} />)

    act(() => {
      vi.advanceTimersByTime(11000)
    })
    expect(onComplete).toHaveBeenCalled()

    const result = onComplete.mock.calls[0][0]
    expect(result).toMatchObject({
      score: expect.any(Number),
      correctCount: expect.any(Number),
      wrongCards: expect.any(Array),
    })
    vi.useRealTimers()
  })
})

// ── 입력 오류 피드백 ──

describe('GameScreen — 입력 오류 피드백', () => {
  it('입력이 없을 때 오류 상태가 아니다', () => {
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    expect(screen.getByTestId('current-input')).toHaveAttribute('data-error', 'false')
  })

  it('접두사가 일치하는 입력은 오류 상태가 아니다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    const firstCard = screen.getAllByTestId('falling-card')[0]
    const answer = firstCard.getAttribute('data-answer')!
    await user.keyboard(answer[0])
    expect(screen.getByTestId('current-input')).toHaveAttribute('data-error', 'false')
  })

  it('어떤 카드에도 매칭 안 되는 입력은 오류 상태다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    await user.keyboard('zzzzzzz')
    expect(screen.getByTestId('current-input')).toHaveAttribute('data-error', 'true')
  })

  it('정답 입력 후 입력창 오류가 초기화된다', async () => {
    const user = userEvent.setup()
    render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
    const firstCard = screen.getAllByTestId('falling-card')[0]
    const answer = firstCard.getAttribute('data-answer')!
    await user.keyboard(answer)
    expect(screen.getByTestId('current-input')).toHaveAttribute('data-error', 'false')
  })
})

// ── 낙하 위치 랜덤화 ──

describe('GameScreen — 낙하 위치 랜덤화', () => {
  it('Math.random 값에 따라 카드의 left 스타일이 결정된다', () => {
    // Math.random을 카드마다 다른 값으로 반환하게 스텁
    const seq = [0.1, 0.4, 0.7, 0.9]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length])
    try {
      render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

      const cards = screen.getAllByTestId('falling-card')
      expect(cards.length).toBeGreaterThanOrEqual(4)

      const lefts = cards.slice(0, 4).map(c => parseFloat((c as HTMLElement).style.left))

      // 기존 결정적 배치(5, 35, 65, 95)와 달라야 함
      expect(lefts).not.toEqual([5, 35, 65, 95])

      // 모든 left 값이 서로 다름 (Math.random이 서로 다른 값을 반환했으므로)
      const unique = new Set(lefts)
      expect(unique.size).toBe(lefts.length)

      // 각 left는 0~100% 범위
      lefts.forEach(l => {
        expect(l).toBeGreaterThanOrEqual(0)
        expect(l).toBeLessThanOrEqual(100)
      })
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('카드의 left 위치는 입력 중 재렌더돼도 변하지 않는다', async () => {
    const user = userEvent.setup()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    try {
      render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)

      const before = screen.getAllByTestId('falling-card').map(c => (c as HTMLElement).style.left)

      // 관련 없는 타이핑으로 재렌더 유발
      await user.keyboard('z')

      const after = screen.getAllByTestId('falling-card').map(c => (c as HTMLElement).style.left)

      expect(after).toEqual(before)
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('인접 카드 간 left 간격이 최소 15%를 유지한다 (충돌 회피)', () => {
    // Math.random이 일부러 첫 값 이후 근접값을 돌려주게 스텁 → 충돌 회피가 없으면 겹침.
    // 시퀀스: 0.5, 0.505 (거의 같음 → 스킵돼야 함), 0.505 (스킵), 0.2, 0.9, 0.3...
    const seq = [0.5, 0.505, 0.501, 0.2, 0.9, 0.3, 0.7, 0.1]
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = seq[i % seq.length]
      i++
      return v
    })
    try {
      render(<GameScreen config={makeConfig()} onComplete={vi.fn()} />)
      const cards = screen.getAllByTestId('falling-card')
      const lefts = cards.slice(0, 4).map(c => parseFloat((c as HTMLElement).style.left))

      // 모든 두 카드 쌍 사이 간격이 최소 15% 이상
      for (let a = 0; a < lefts.length; a++) {
        for (let b = a + 1; b < lefts.length; b++) {
          expect(Math.abs(lefts[a] - lefts[b])).toBeGreaterThanOrEqual(15)
        }
      }
    } finally {
      vi.restoreAllMocks()
    }
  })
})
