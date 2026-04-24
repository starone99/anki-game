// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeckLoader } from '../../components/DeckLoader'
import { parseApkg } from '../../lib/parser'
import type { GameConfig } from '../../types'

// parseApkg를 mock — 실제 파일 파싱은 parser 테스트에서 검증
vi.mock('../../lib/parser', () => ({
  parseApkg: vi.fn().mockResolvedValue([
    { word: '食べる', reading: 'たべる', meanings: ['먹다'] },
    { word: '飲む', reading: 'のむ', meanings: ['마시다'] },
  ]),
}))

describe('DeckLoader — 렌더링', () => {
  it('파일 드롭존이 렌더링된다', () => {
    render(<DeckLoader onStart={vi.fn()} />)
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  })

  it('내장 덱 버튼 3개가 렌더링된다', () => {
    render(<DeckLoader onStart={vi.fn()} />)
    expect(screen.getAllByText('히라가나').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('가타카나')).toBeInTheDocument()
    expect(screen.getByText('히라가나 + 가타카나')).toBeInTheDocument()
  })

  it('입력 모드 선택 옵션 4개가 렌더링된다', () => {
    render(<DeckLoader onStart={vi.fn()} />)
    expect(screen.getByText('로마자')).toBeInTheDocument()
    expect(screen.getByText('한국어 발음')).toBeInTheDocument()
    // "히라가나"는 내장 덱 버튼과 입력 모드 버튼에 각각 존재
    expect(screen.getAllByText('히라가나').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('의미')).toBeInTheDocument()
  })

  it('세션 크기 슬라이더가 기본값 20으로 렌더링된다', () => {
    render(<DeckLoader onStart={vi.fn()} />)
    const slider = screen.getByRole('slider', { name: /세션 크기/i })
    expect(slider).toHaveValue('20')
  })

  it('난이도 선택 옵션 3개가 렌더링된다', () => {
    render(<DeckLoader onStart={vi.fn()} />)
    expect(screen.getByText('쉬움')).toBeInTheDocument()
    expect(screen.getByText('보통')).toBeInTheDocument()
    expect(screen.getByText('어려움')).toBeInTheDocument()
  })

  it('덱 로드 전에는 시작 버튼이 비활성화된다', () => {
    render(<DeckLoader onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /시작/i })).toBeDisabled()
  })
})

describe('DeckLoader file loading resilience', () => {
  it('accepts uppercase .APKG files', async () => {
    render(<DeckLoader onStart={vi.fn()} />)
    const dropzone = screen.getByTestId('dropzone')
    const file = new File(['dummy'], 'TEST.APKG', { type: 'application/octet-stream' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/2/)).toBeInTheDocument()
    })
  })

  it('shows an error when parsing fails', async () => {
    vi.mocked(parseApkg).mockRejectedValueOnce(new Error('bad deck'))
    render(<DeckLoader onStart={vi.fn()} />)
    const dropzone = screen.getByTestId('dropzone')
    const file = new File(['dummy'], 'broken.apkg', { type: 'application/octet-stream' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/bad deck/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /시작|start/i })).toBeDisabled()
  })
})

describe('DeckLoader — 파일 드롭', () => {
  it('.apkg 파일을 드롭하면 카드 수가 표시된다', async () => {
    render(<DeckLoader onStart={vi.fn()} />)
    const dropzone = screen.getByTestId('dropzone')
    const file = new File(['dummy'], 'test.apkg', { type: 'application/octet-stream' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/2장/)).toBeInTheDocument()
    })
  })

  it('파일 드롭 후 시작 버튼이 활성화된다', async () => {
    render(<DeckLoader onStart={vi.fn()} />)
    const dropzone = screen.getByTestId('dropzone')
    const file = new File(['dummy'], 'test.apkg', { type: 'application/octet-stream' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /시작/i })).toBeEnabled()
    })
  })

  it('.apkg가 아닌 파일은 에러 메시지를 표시한다', async () => {
    render(<DeckLoader onStart={vi.fn()} />)
    const dropzone = screen.getByTestId('dropzone')
    const file = new File(['dummy'], 'test.txt', { type: 'text/plain' })

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/.apkg 파일만 지원/i)).toBeInTheDocument()
    })
  })
})

describe('DeckLoader — 드롭존 클릭', () => {
  it('드롭존 클릭 시 숨겨진 파일 input이 존재한다', () => {
    render(<DeckLoader onStart={vi.fn()} />)
    const input = document.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('accept', '.apkg')
  })

  it('파일 input으로 .apkg 파일을 선택하면 카드 수가 표시된다', async () => {
    render(<DeckLoader onStart={vi.fn()} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['dummy'], 'test.apkg', { type: 'application/octet-stream' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText(/2장/)).toBeInTheDocument()
    })
  })
})

describe('DeckLoader — 내장 덱', () => {
  it('히라가나 버튼 클릭 시 시작 버튼이 활성화된다', async () => {
    const user = userEvent.setup()
    render(<DeckLoader onStart={vi.fn()} />)

    await user.click(screen.getAllByText('히라가나')[0])
    expect(screen.getByRole('button', { name: /시작/i })).toBeEnabled()
  })

  it('가타카나 버튼 클릭 시 시작 버튼이 활성화된다', async () => {
    const user = userEvent.setup()
    render(<DeckLoader onStart={vi.fn()} />)

    await user.click(screen.getByText('가타카나'))
    expect(screen.getByRole('button', { name: /시작/i })).toBeEnabled()
  })

  it('클릭한 내장 덱 버튼만 활성화된다', async () => {
    const user = userEvent.setup()
    render(<DeckLoader onStart={vi.fn()} />)

    const hiraganaButton = screen.getAllByText('히라가나')[0]
    const katakanaButton = screen.getByText('가타카나')

    await user.click(hiraganaButton)
    expect(hiraganaButton).toHaveClass('active')
    expect(katakanaButton).not.toHaveClass('active')

    await user.click(katakanaButton)
    expect(hiraganaButton).not.toHaveClass('active')
    expect(katakanaButton).toHaveClass('active')
  })
})

describe('DeckLoader — 설정 및 시작', () => {
  let onStart: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onStart = vi.fn()
  })

  it('시작 버튼 클릭 시 onStart에 GameConfig가 전달된다', async () => {
    const user = userEvent.setup()
    render(<DeckLoader onStart={onStart} />)

    await user.click(screen.getAllByText('히라가나')[0])
    await user.click(screen.getByRole('button', { name: /시작/i }))

    expect(onStart).toHaveBeenCalledOnce()
    const config: GameConfig = onStart.mock.calls[0][0]
    expect(config.cards).toBeDefined()
    expect(config.sessionSize).toBe(20)
    expect(config.inputMode).toBeDefined()
    expect(config.difficulty).toBeDefined()
  })

  it('세션 크기를 30으로 변경하면 config에 반영된다', async () => {
    const user = userEvent.setup()
    render(<DeckLoader onStart={onStart} />)

    const slider = screen.getByRole('slider', { name: /세션 크기/i })
    fireEvent.change(slider, { target: { value: '30' } })

    await user.click(screen.getAllByText('히라가나')[0])
    await user.click(screen.getByRole('button', { name: /시작/i }))

    const config: GameConfig = onStart.mock.calls[0][0]
    expect(config.sessionSize).toBe(30)
  })

  it('입력 모드를 변경하면 config에 반영된다', async () => {
    const user = userEvent.setup()
    render(<DeckLoader onStart={onStart} />)

    await user.click(screen.getByText('한국어 발음'))
    await user.click(screen.getAllByText('히라가나')[0])
    await user.click(screen.getByRole('button', { name: /시작/i }))

    const config: GameConfig = onStart.mock.calls[0][0]
    expect(config.inputMode).toBe('korean-pronunciation')
  })

  it('난이도를 어려움으로 변경하면 config에 반영된다', async () => {
    const user = userEvent.setup()
    render(<DeckLoader onStart={onStart} />)

    await user.click(screen.getByText('어려움'))
    await user.click(screen.getAllByText('히라가나')[0])
    await user.click(screen.getByRole('button', { name: /시작/i }))

    const config: GameConfig = onStart.mock.calls[0][0]
    expect(config.difficulty).toBe('hard')
  })
})

describe('DeckLoader — 셔플 옵션', () => {
  it('시작 시 기본값은 shuffle: false가 config에 포함된다', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<DeckLoader onStart={onStart} />)

    // 내장 덱 '히라가나' 프리셋 선택 (첫 번째 "히라가나" 버튼 = 내장 덱)
    await user.click(screen.getAllByText('히라가나')[0])

    // 시작 버튼
    await user.click(screen.getByRole('button', { name: /시작/ }))

    expect(onStart).toHaveBeenCalledTimes(1)
    const cfg = onStart.mock.calls[0][0]
    expect(cfg).toMatchObject({ shuffle: false })
  })

  it('셔플 토글 켜고 시작하면 config에 shuffle: true가 포함된다', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<DeckLoader onStart={onStart} />)

    // 프리셋 선택 (첫 번째 "히라가나" 버튼 = 내장 덱)
    await user.click(screen.getAllByText('히라가나')[0])

    // 셔플 토글 찾아서 클릭 (checkbox 또는 button) — name: /셔플/
    const shuffleToggle = screen.getByRole('checkbox', { name: /셔플/ })
    await user.click(shuffleToggle)
    expect(shuffleToggle).toBeChecked()

    await user.click(screen.getByRole('button', { name: /시작/ }))

    const cfg = onStart.mock.calls[0][0]
    expect(cfg).toMatchObject({ shuffle: true })
  })
})
