import { describe, it, expect } from 'vitest'
import { matchInput, toRomaji, toKoreanPronunciation } from '../lib/input'
import type { Card, InputMode } from '../lib/input'

// ── C2: 입력 매칭 엔진 ──────────────────────────────────────────

const sampleCard: Card = {
  word: '比べる',
  reading: 'くらべる',
  meanings: ['비교하다', '비교'],
}

// ── 로마자 모드 ──

describe('matchInput - romaji mode', () => {
  const mode: InputMode = 'romaji'

  it('완전 일치하면 true를 반환한다', () => {
    expect(matchInput('kuraberu', sampleCard, mode)).toBe(true)
  })

  it('대소문자 무관하게 매칭한다', () => {
    expect(matchInput('KURABERU', sampleCard, mode)).toBe(true)
  })

  it('틀린 입력은 false를 반환한다', () => {
    expect(matchInput('taberu', sampleCard, mode)).toBe(false)
  })

  it('부분 입력은 false를 반환한다', () => {
    expect(matchInput('kura', sampleCard, mode)).toBe(false)
  })
})

// ── 한국어 발음 모드 ──

describe('matchInput - korean pronunciation mode', () => {
  const mode: InputMode = 'korean-pronunciation'

  it('한국어 발음으로 완전 일치하면 true를 반환한다', () => {
    expect(matchInput('쿠라베루', sampleCard, mode)).toBe(true)
  })

  it('틀린 발음은 false를 반환한다', () => {
    expect(matchInput('타베루', sampleCard, mode)).toBe(false)
  })
})

// ── 히라가나 직접 모드 ──

describe('matchInput - hiragana mode', () => {
  const mode: InputMode = 'hiragana'

  it('히라가나 완전 일치하면 true를 반환한다', () => {
    expect(matchInput('くらべる', sampleCard, mode)).toBe(true)
  })

  it('틀린 히라가나는 false를 반환한다', () => {
    expect(matchInput('たべる', sampleCard, mode)).toBe(false)
  })
})

// ── 의미 모드 ──

describe('matchInput - meaning mode', () => {
  const mode: InputMode = 'meaning'

  it('meanings 배열 중 하나와 일치하면 true를 반환한다', () => {
    expect(matchInput('비교하다', sampleCard, mode)).toBe(true)
    expect(matchInput('비교', sampleCard, mode)).toBe(true)
  })

  it('앞뒤 공백을 무시하고 매칭한다', () => {
    expect(matchInput(' 비교하다 ', sampleCard, mode)).toBe(true)
  })

  it('없는 의미는 false를 반환한다', () => {
    expect(matchInput('먹다', sampleCard, mode)).toBe(false)
  })
})

// ── toRomaji 변환 ──

describe('toRomaji', () => {
  it('히라가나를 로마자로 변환한다', () => {
    expect(toRomaji('くらべる')).toBe('kuraberu')
    expect(toRomaji('たべる')).toBe('taberu')
    expect(toRomaji('おうだん')).toBe('oudan')
  })

  it('가타카나도 로마자로 변환한다', () => {
    expect(toRomaji('クラベル')).toBe('kuraberu')
  })

  it('촉음(っ)을 처리한다', () => {
    expect(toRomaji('きって')).toBe('kitte')
  })

  it('장음부호(ー)를 처리한다', () => {
    expect(toRomaji('コーヒー')).toBe('koohii')
  })
})

// ── toKoreanPronunciation 변환 ──

describe('toKoreanPronunciation', () => {
  it('히라가나를 한국어 발음으로 변환한다', () => {
    expect(toKoreanPronunciation('くらべる')).toBe('쿠라베루')
    expect(toKoreanPronunciation('たべる')).toBe('타베루')
  })

  it('가타카나도 한국어 발음으로 변환한다', () => {
    expect(toKoreanPronunciation('コーヒー')).toBe('코히')
  })

  it('あいうえお 기본 모음을 변환한다', () => {
    expect(toKoreanPronunciation('あいうえお')).toBe('아이우에오')
  })

  it('か행을 변환한다', () => {
    expect(toKoreanPronunciation('かきくけこ')).toBe('카키쿠케코')
  })
})

// ── 부분 입력 하이라이트 (접두사 매칭) ──

describe('isPrefixMatch', () => {
  it('입력이 로마자 정답의 접두사이면 true를 반환한다', () => {
    const { isPrefixMatch } = require('../lib/input')
    expect(isPrefixMatch('kur', sampleCard, 'romaji')).toBe(true)
    expect(isPrefixMatch('ku', sampleCard, 'romaji')).toBe(true)
  })

  it('접두사가 아니면 false를 반환한다', () => {
    const { isPrefixMatch } = require('../lib/input')
    expect(isPrefixMatch('tab', sampleCard, 'romaji')).toBe(false)
  })
})
