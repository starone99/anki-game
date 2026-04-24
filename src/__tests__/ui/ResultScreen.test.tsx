// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultScreen } from '../../components/ResultScreen'
import type { GameResult } from '../../types'

const makeResult = (overrides?: Partial<GameResult>): GameResult => ({
  score: 8,
  correctCount: 8,
  wrongCards: [
    { word: '食べる', reading: 'たべる', meanings: ['먹다'] },
    { word: '飲む', reading: 'のむ', meanings: ['마시다'] },
  ],
  totalCount: 10,
  ...overrides,
})

// ── 렌더링 ──

describe('ResultScreen — 렌더링', () => {
  it('점수가 표시된다', () => {
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)
    expect(screen.getByTestId('result-score')).toHaveTextContent('8')
  })

  it('정답률이 표시된다', () => {
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)
    expect(screen.getByTestId('result-accuracy')).toHaveTextContent('80%')
  })

  it('정답률 계산: first-pass correct cards / totalCount', () => {
    render(<ResultScreen result={makeResult({ correctCount: 4, totalCount: 4, wrongCards: [{ word: '誤答', reading: 'ごとう', meanings: ['wrong'] }] })} onRestart={vi.fn()} />)
    expect(screen.getByTestId('result-accuracy')).toHaveTextContent('75%')
  })

  it('totalCount가 0이면 정답률 0%', () => {
    render(<ResultScreen result={makeResult({ correctCount: 0, totalCount: 0 })} onRestart={vi.fn()} />)
    expect(screen.getByTestId('result-accuracy')).toHaveTextContent('0%')
  })

  it('틀린 카드 목록이 표시된다', () => {
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)
    expect(screen.getByTestId('wrong-cards-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('wrong-card-item').length).toBe(2)
  })

  it('각 틀린 카드에 단어, 읽기, 의미가 표시된다', () => {
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)
    const items = screen.getAllByTestId('wrong-card-item')
    expect(items[0]).toHaveTextContent('食べる')
    expect(items[0]).toHaveTextContent('たべる')
    expect(items[0]).toHaveTextContent('먹다')
  })

  it('틀린 카드가 없으면 목록이 비어있다', () => {
    render(<ResultScreen result={makeResult({ wrongCards: [] })} onRestart={vi.fn()} />)
    expect(screen.queryAllByTestId('wrong-card-item').length).toBe(0)
  })

  it('다시하기 버튼이 렌더링된다', () => {
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /다시하기/i })).toBeInTheDocument()
  })

  it('틀린 카드가 있으면 복습 버튼이 렌더링된다', () => {
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} onReviewWrong={vi.fn()} />)
    expect(screen.getByRole('button', { name: /review missed/i })).toBeInTheDocument()
  })
})

// ── 상호작용 ──

describe('ResultScreen — 상호작용', () => {
  it('다시하기 버튼 클릭 시 onRestart가 호출된다', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    render(<ResultScreen result={makeResult()} onRestart={onRestart} />)

    await user.click(screen.getByRole('button', { name: /다시하기/i }))

    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('복습 버튼 클릭 시 onReviewWrong이 호출된다', async () => {
    const user = userEvent.setup()
    const onReviewWrong = vi.fn()
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} onReviewWrong={onReviewWrong} />)

    await user.click(screen.getByRole('button', { name: /review missed/i }))

    expect(onReviewWrong).toHaveBeenCalledOnce()
  })
})

// ── 퍼펙트 클리어 ──

describe('ResultScreen — 퍼펙트 클리어', () => {
  it('틀린 카드가 없으면 퍼펙트 메시지가 표시된다', () => {
    render(<ResultScreen result={makeResult({ wrongCards: [], correctCount: 10, totalCount: 10 })} onRestart={vi.fn()} />)
    expect(screen.getByTestId('perfect-message')).toBeInTheDocument()
  })

  it('틀린 카드가 있으면 퍼펙트 메시지가 없다', () => {
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)
    expect(screen.queryByTestId('perfect-message')).not.toBeInTheDocument()
  })
})
