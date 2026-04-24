import { describe, it, expect } from 'vitest'
import { toCsv, toPrintableHtml } from '../lib/export'
import type { Card } from '../lib/input'

describe('toCsv', () => {
  it('빈 배열이면 헤더 한 줄만 반환한다 (뒤 개행 없음)', () => {
    expect(toCsv([])).toBe('word,reading,meaning')
  })

  it('카드 1개면 헤더 다음 줄에 word,reading,meaning 순서로 값이 찍힌다', () => {
    const cards: Card[] = [
      { word: '食べる', reading: 'たべる', meanings: ['먹다'] },
    ]
    expect(toCsv(cards)).toBe('word,reading,meaning\n食べる,たべる,먹다')
  })

  it('카드 여러 개면 입력 순서대로 \\n 으로 이어 붙이고 마지막 개행은 없다', () => {
    const cards: Card[] = [
      { word: '食べる', reading: 'たべる', meanings: ['먹다'] },
      { word: '飲む', reading: 'のむ', meanings: ['마시다'] },
      { word: '見る', reading: 'みる', meanings: ['보다'] },
    ]
    const expected =
      'word,reading,meaning\n' +
      '食べる,たべる,먹다\n' +
      '飲む,のむ,마시다\n' +
      '見る,みる,보다'
    expect(toCsv(cards)).toBe(expected)
  })

  it('meanings가 여러 개면 세미콜론(;)으로 join 한다', () => {
    const cards: Card[] = [
      { word: '飲む', reading: 'のむ', meanings: ['먹다', '취하다'] },
    ]
    expect(toCsv(cards)).toBe('word,reading,meaning\n飲む,のむ,먹다;취하다')
  })

  it('값에 쉼표가 포함되면 큰따옴표로 감싼다', () => {
    const cards: Card[] = [
      { word: 'a,b', reading: 'よみ', meanings: ['뜻'] },
    ]
    expect(toCsv(cards)).toBe('word,reading,meaning\n"a,b",よみ,뜻')
  })

  it('값에 큰따옴표가 포함되면 큰따옴표로 감싸고 내부 따옴표는 이중화한다', () => {
    const cards: Card[] = [
      { word: '言う', reading: 'いう', meanings: ['she said "hi"'] },
    ]
    expect(toCsv(cards)).toBe(
      'word,reading,meaning\n言う,いう,"she said ""hi"""',
    )
  })

  it('값에 개행이 포함되면 큰따옴표로 감싼다 (CRLF 아님)', () => {
    const cards: Card[] = [
      { word: '語', reading: 'line1\nline2', meanings: ['뜻'] },
    ]
    expect(toCsv(cards)).toBe('word,reading,meaning\n語,"line1\nline2",뜻')
  })

  it('id 필드는 CSV에 포함되지 않는다 (있어도 무시)', () => {
    const cards: Card[] = [
      {
        id: 'card-123',
        word: '食べる',
        reading: 'たべる',
        meanings: ['먹다'],
      },
    ]
    expect(toCsv(cards)).toBe('word,reading,meaning\n食べる,たべる,먹다')
  })

  it('id가 undefined여도 에러 없이 동작한다', () => {
    const cards: Card[] = [
      { word: '食べる', reading: 'たべる', meanings: ['먹다'] },
    ]
    expect(() => toCsv(cards)).not.toThrow()
    expect(toCsv(cards)).toBe('word,reading,meaning\n食べる,たべる,먹다')
  })
})

describe('toPrintableHtml', () => {
  it('반환 문자열은 <!DOCTYPE html>로 시작하고 html/head/body/</html>를 포함한다', () => {
    const html = toPrintableHtml([])
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<html')
    expect(html).toContain('<head')
    expect(html).toContain('<body')
    expect(html).toContain('</html>')
  })

  it('<title> 태그가 존재하고 그 내용은 "MISSED CARDS"를 포함한다', () => {
    const html = toPrintableHtml([])
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/)
    expect(titleMatch).not.toBeNull()
    expect(titleMatch![1]).toContain('MISSED CARDS')
  })

  it('<style> 태그 내부에 @media print 문자열이 등장한다', () => {
    const html = toPrintableHtml([])
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)
    expect(styleMatch).not.toBeNull()
    expect(styleMatch![1]).toContain('@media print')
  })

  it('빈 배열이면 유효한 HTML을 반환하고 "card" 클래스가 등장하지 않는다', () => {
    const html = toPrintableHtml([])
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('<body')
    expect(html).not.toContain('"card"')
    expect(html).toContain('틀린 카드가 없습니다')
  })

  it('단일 카드의 word/reading/meaning이 모두 반환 문자열에 포함된다', () => {
    const cards: Card[] = [
      { word: '食べる', reading: 'たべる', meanings: ['먹다'] },
    ]
    const html = toPrintableHtml(cards)
    expect(html).toContain('食べる')
    expect(html).toContain('たべる')
    expect(html).toContain('먹다')
  })

  it('카드 2개 이상이면 입력 순서대로 등장한다', () => {
    const cards: Card[] = [
      { word: '食べる', reading: 'たべる', meanings: ['먹다'] },
      { word: '飲む', reading: 'のむ', meanings: ['마시다'] },
    ]
    const html = toPrintableHtml(cards)
    expect(html.indexOf('食べる')).toBeLessThan(html.indexOf('飲む'))
  })

  it('meanings가 여러 개면 모두 렌더된다', () => {
    const cards: Card[] = [
      { word: '飲む', reading: 'のむ', meanings: ['먹다', '취하다'] },
    ]
    const html = toPrintableHtml(cards)
    expect(html).toContain('먹다')
    expect(html).toContain('취하다')
  })

  it('word/reading/meaning의 <, >, & 문자는 HTML 엔티티로 이스케이프된다', () => {
    const cards: Card[] = [
      { word: 'a<b&c', reading: 'r>s&t', meanings: ['m<n&o'] },
    ]
    const html = toPrintableHtml(cards)
    expect(html).toContain('a&lt;b&amp;c')
    expect(html).toContain('r&gt;s&amp;t')
    expect(html).toContain('m&lt;n&amp;o')
    expect(html).not.toContain('a<b&c')
    expect(html).not.toContain('r>s&t')
    expect(html).not.toContain('m<n&o')
  })
})
