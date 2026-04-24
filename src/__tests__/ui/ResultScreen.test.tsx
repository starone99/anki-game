// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultScreen } from '../../components/ResultScreen'
import type { GameResult } from '../../types'
import { toCsv, toPrintableHtml } from '../../lib/export'

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

// ── CSV 다운로드 ──

describe('ResultScreen — CSV 다운로드', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  const originalAnchorClick = HTMLAnchorElement.prototype.click
  const originalCreateElement = document.createElement.bind(document)

  afterEach(() => {
    // 전역 스파이 원복
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    HTMLAnchorElement.prototype.click = originalAnchorClick
    vi.restoreAllMocks()
  })

  it('틀린 카드가 있을 때 "CSV 다운로드" 버튼이 렌더된다', () => {
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /CSV/ })).toBeInTheDocument()
  })

  it('틀린 카드가 없으면 CSV 버튼이 렌더되지 않는다', () => {
    render(
      <ResultScreen
        result={makeResult({ wrongCards: [], correctCount: 10, totalCount: 10 })}
        onRestart={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /CSV/ })).toBeNull()
  })

  it('CSV 버튼 클릭 시 toCsv 결과 내용을 담은 Blob 다운로드가 트리거된다', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /CSV/ }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const arg = createObjectURL.mock.calls[0][0]
    expect(arg).toBeInstanceOf(Blob)
    expect((arg as Blob).type).toContain('text/csv')
    expect(anchorClickSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  it('Blob 내용이 toCsv(wrongCards)와 동일하다', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const result = makeResult()
    render(<ResultScreen result={result} onRestart={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /CSV/ }))

    const blob = createObjectURL.mock.calls[0][0] as Blob
    const text = await blob.text()
    expect(text).toBe(toCsv(result.wrongCards))
  })

  it('다운로드 파일명에 .csv 확장자가 포함된다', async () => {
    const user = userEvent.setup()
    URL.createObjectURL = vi
      .fn()
      .mockReturnValue('blob:mock-url') as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const createdAnchors: HTMLAnchorElement[] = []
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const el = originalCreateElement(tagName, options)
      if (tagName.toLowerCase() === 'a') {
        createdAnchors.push(el as HTMLAnchorElement)
      }
      return el
    })

    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /CSV/ }))

    const anchorWithDownload = createdAnchors.find((a) => a.hasAttribute('download'))
    expect(anchorWithDownload).toBeTruthy()
    const download = anchorWithDownload!.getAttribute('download') ?? ''
    expect(download.length).toBeGreaterThan(0)
    expect(download.endsWith('.csv')).toBe(true)
  })
})

// ── PDF 인쇄 ──

describe('ResultScreen — PDF 인쇄', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('틀린 카드가 있을 때 "PDF로 인쇄" 버튼이 렌더된다', () => {
    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /인쇄/ })).toBeInTheDocument()
  })

  it('틀린 카드가 없으면 인쇄 버튼이 렌더되지 않는다', () => {
    render(
      <ResultScreen
        result={makeResult({ wrongCards: [], correctCount: 10, totalCount: 10 })}
        onRestart={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /인쇄/ })).toBeNull()
  })

  it('인쇄 버튼 클릭 시 새 창이 열리고 print()가 호출된다', async () => {
    const user = userEvent.setup()
    const fakeWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    }
    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValue(fakeWindow as unknown as Window)

    const result = makeResult()
    render(<ResultScreen result={result} onRestart={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /인쇄/ }))

    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(fakeWindow.document.write).toHaveBeenCalledTimes(1)
    expect(fakeWindow.document.write.mock.calls[0][0]).toBe(
      toPrintableHtml(result.wrongCards),
    )
    expect(fakeWindow.document.close).toHaveBeenCalled()
    expect(fakeWindow.print).toHaveBeenCalled()
  })

  it('window.open 반환이 null이면 안전하게 무시한다', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'open').mockReturnValue(null)

    render(<ResultScreen result={makeResult()} onRestart={vi.fn()} />)

    await expect(
      user.click(screen.getByRole('button', { name: /인쇄/ })),
    ).resolves.not.toThrow()
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
