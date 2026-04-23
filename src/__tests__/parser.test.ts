import { describe, it, expect } from 'vitest'
import { parseApkg, extractCardFields, stripHtml, splitMeanings } from '../lib/parser'

// ── C1: .apkg 파싱 ──────────────────────────────────────────────

describe('stripHtml', () => {
  it('div 태그 안의 텍스트만 추출한다', () => {
    expect(stripHtml('比べる<div>くらべる</div>')).toBe('比べる くらべる')
  })

  it('br 태그를 공백으로 대체한다', () => {
    expect(stripHtml('計算<br>けいさん')).toBe('計算 けいさん')
  })

  it('중첩 태그도 제거한다', () => {
    expect(stripHtml('<div>모퉁이</div>')).toBe('모퉁이')
  })

  it('태그 없는 텍스트는 그대로 반환한다', () => {
    expect(stripHtml('横断')).toBe('横断')
  })
})

describe('splitMeanings', () => {
  it('쉼표로 구분된 의미를 배열로 분리한다', () => {
    expect(splitMeanings('싸다, 포장하다')).toEqual(['싸다', '포장하다'])
  })

  it('단일 의미는 배열 1개로 반환한다', () => {
    expect(splitMeanings('비교하다')).toEqual(['비교하다'])
  })

  it('앞뒤 공백을 제거한다', () => {
    expect(splitMeanings(' 싸다 ,  포장하다 ')).toEqual(['싸다', '포장하다'])
  })

  it('빈 문자열 항목을 제외한다', () => {
    expect(splitMeanings('싸다,,포장하다')).toEqual(['싸다', '포장하다'])
  })
})

describe('extractCardFields', () => {
  it('Back 필드에서 단어(한자)와 읽기(히라가나)를 분리 추출한다', () => {
    const result = extractCardFields({
      front: '비교하다',
      back: '比べる<div>くらべる</div>',
    })
    expect(result.word).toBe('比べる')
    expect(result.reading).toBe('くらべる')
    expect(result.meanings).toEqual(['비교하다'])
  })

  it('br 구분 형식도 처리한다', () => {
    const result = extractCardFields({
      front: '계산',
      back: '計算<br>けいさん',
    })
    expect(result.word).toBe('計算')
    expect(result.reading).toBe('けいさん')
  })

  it('Front 필드의 HTML 태그도 제거한다', () => {
    const result = extractCardFields({
      front: '<div>모퉁이</div>',
      back: '角<div>かど</div>',
    })
    expect(result.meanings).toEqual(['모퉁이'])
  })

  it('복수 의미를 배열로 반환한다', () => {
    const result = extractCardFields({
      front: '싸다, 포장하다',
      back: '包む<div>つつむ</div>',
    })
    expect(result.meanings).toEqual(['싸다', '포장하다'])
  })

  it('Back 필드에 태그가 없으면 전체를 단어로 사용하고 읽기는 빈 문자열', () => {
    const result = extractCardFields({
      front: '가로지르다',
      back: '横断',
    })
    expect(result.word).toBe('横断')
    expect(result.reading).toBe('')
  })
})

describe('parseApkg', () => {
  it('ArrayBuffer를 받아 카드 배열을 반환한다', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const apkgPath = path.resolve(__dirname, '../../reference/reference.txt')

    if (!fs.existsSync(apkgPath)) {
      console.warn('reference.txt 없음 — 스킵')
      return
    }

    const buffer = fs.readFileSync(apkgPath)
    const cards = await parseApkg(buffer.buffer)

    expect(cards.length).toBeGreaterThan(0)
    expect(cards[0]).toMatchObject({
      word: expect.any(String),
      reading: expect.any(String),
      meanings: expect.any(Array),
    })
  })

  it('파싱된 카드의 word가 빈 문자열이 아니다', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const apkgPath = path.resolve(__dirname, '../../reference/reference.txt')

    if (!fs.existsSync(apkgPath)) return

    const buffer = fs.readFileSync(apkgPath)
    const cards = await parseApkg(buffer.buffer)

    cards.slice(0, 10).forEach(card => {
      expect(card.word.length).toBeGreaterThan(0)
    })
  })
})
