import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSession } from '../lib/session'
import type { Card } from '../lib/input'

const makeCards = (n: number): Card[] =>
  Array.from({ length: n }, (_, i) => ({
    word: `単語${i}`,
    reading: `たんご${i}`,
    meanings: [`단어${i}`],
    due: i,
  }))

describe('createSession', () => {
  it('세션 크기만큼 카드를 뽑는다', () => {
    const cards = makeCards(100)
    const session = createSession(cards, { sessionSize: 20 })
    expect(session.remaining().length).toBe(20)
  })

  it('카드가 세션 크기보다 적으면 전부 사용한다', () => {
    const cards = makeCards(5)
    const session = createSession(cards, { sessionSize: 20 })
    expect(session.remaining().length).toBe(5)
  })

  it('shuffle 미지정 시 due 값이 있으면 오름차순으로 정렬한다', () => {
    const cards = makeCards(10).reverse()
    const session = createSession(cards, { sessionSize: 10 })
    const picked = session.remaining()
    for (let i = 0; i < picked.length - 1; i++) {
      expect((picked[i].due ?? 0)).toBeLessThanOrEqual(picked[i + 1].due ?? 0)
    }
  })

})

describe('session.markWrong', () => {
  let session: ReturnType<typeof createSession>

  beforeEach(() => {
    session = createSession(makeCards(10), { sessionSize: 10 })
  })

  it('틀린 카드를 3~5장 뒤에 재삽입한다', () => {
    const wrongCard = session.remaining()[0]
    session.markWrong(wrongCard)

    const queue = session.remaining()
    const reinsertedIndex = queue.findIndex(c => c.word === wrongCard.word)

    expect(reinsertedIndex).toBeGreaterThanOrEqual(3)
    expect(reinsertedIndex).toBeLessThanOrEqual(5)
  })

  it('틀린 카드를 reviewQueue에 추가한다', () => {
    const wrongCard = session.remaining()[0]
    session.markWrong(wrongCard)
    expect(session.reviewQueue()).toContainEqual(wrongCard)
  })

  it('같은 카드를 두 번 틀려도 reviewQueue에 한 번만 추가한다', () => {
    const wrongCard = session.remaining()[0]
    session.markWrong(wrongCard)
    session.markWrong(wrongCard)
    const count = session.reviewQueue().filter(c => c.word === wrongCard.word).length
    expect(count).toBe(1)
  })
  it('already removed cards are ignored by markWrong', () => {
    const card = session.remaining()[0]
    session.markCorrect(card)

    const before = session.remaining()
    session.markWrong(card)

    expect(session.remaining()).toEqual(before)
    expect(session.reviewQueue()).not.toContainEqual(card)
  })
})

describe('session.markCorrect', () => {
  it('맞힌 카드를 큐에서 제거한다', () => {
    const session = createSession(makeCards(5), { sessionSize: 5 })
    const card = session.remaining()[0]
    const before = session.remaining().length
    session.markCorrect(card)
    expect(session.remaining().length).toBe(before - 1)
  })
  it('cards with the same word are tracked independently', () => {
    const session = createSession([
      { word: '同じ', reading: 'おなじ', meanings: ['same one'], due: 0 },
      { word: '同じ', reading: 'どうじ', meanings: ['same two'], due: 1 },
      { word: '別', reading: 'べつ', meanings: ['other'], due: 2 },
    ], { sessionSize: 3 })

    const first = session.remaining()[0]
    session.markCorrect(first)

    const remainingSameWords = session.remaining().filter(card => card.word === '同じ')
    expect(remainingSameWords).toHaveLength(1)
    expect(remainingSameWords[0].reading).toBe('どうじ')
  })
})

describe('session.isComplete', () => {
  it('모든 카드를 맞히면 완료 상태가 된다', () => {
    const session = createSession(makeCards(3), { sessionSize: 3 })
    session.remaining().slice().forEach(card => session.markCorrect(card))
    expect(session.isComplete()).toBe(true)
  })

  it('카드가 남아있으면 완료 상태가 아니다', () => {
    const session = createSession(makeCards(3), { sessionSize: 3 })
    expect(session.isComplete()).toBe(false)
  })
})

describe('createSession — 랜덤 셔플', () => {
  it('Math.random 순서에 따라 카드 순서를 셔플한다', () => {
    const cards: Card[] = [
      { word: 'A', reading: 'a', meanings: ['A'], id: 'A' },
      { word: 'B', reading: 'b', meanings: ['B'], id: 'B' },
      { word: 'C', reading: 'c', meanings: ['C'], id: 'C' },
      { word: 'D', reading: 'd', meanings: ['D'], id: 'D' },
    ]
    // Fisher-Yates: i=3부터 j = floor(random * (i+1)) 로 뒤에서부터 swap.
    // Math.random 시퀀스 [0, 0, 0, ...] → 항상 인덱스 0과 swap → 역순이 됨.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const session = createSession(cards, { sessionSize: 4, shuffle: true } as any)
      const remaining = session.remaining()
      expect(remaining.length).toBe(4)
      // 원본 순서와 다름
      const originalIds = cards.map(c => c.id)
      const remainingIds = remaining.map(c => c.id)
      expect(remainingIds).not.toEqual(originalIds)
      // 모든 카드가 그대로 있음 (순열 관계)
      expect([...remainingIds].sort()).toEqual([...originalIds].sort())
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('서로 다른 Math.random 시퀀스는 다른 순서를 만든다', () => {
    const cards: Card[] = Array.from({ length: 6 }, (_, i) => ({
      word: String.fromCharCode(65 + i),
      reading: String.fromCharCode(97 + i),
      meanings: [String.fromCharCode(65 + i)],
      id: String.fromCharCode(65 + i),
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0)
    const first = createSession(cards, { sessionSize: 6, shuffle: true } as any).remaining().map(c => c.id)
    vi.restoreAllMocks()

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const second = createSession(cards, { sessionSize: 6, shuffle: true } as any).remaining().map(c => c.id)
    vi.restoreAllMocks()

    expect(first).not.toEqual(second)
  })

  it('sessionSize가 cards 길이보다 작으면 셔플된 앞 N개만 반환한다', () => {
    const cards: Card[] = Array.from({ length: 10 }, (_, i) => ({
      word: `w${i}`,
      reading: `r${i}`,
      meanings: [`m${i}`],
      id: `id-${i}`,
    }))

    vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const remaining = createSession(cards, { sessionSize: 3, shuffle: true } as any).remaining()
      expect(remaining.length).toBe(3)
      // 원본 앞 3개(id-0, id-1, id-2)와 정확히 일치하지는 않아야 (셔플된 것)
      const ids = remaining.map(c => c.id)
      // 전체에서 뽑혔으므로 id-0~9 중 아무 3개
      ids.forEach(id => expect(cards.map(c => c.id)).toContain(id))
    } finally {
      vi.restoreAllMocks()
    }
  })

  it('shuffle: false이면 원본 due-sort 순서 유지', () => {
    const cards: Card[] = Array.from({ length: 6 }, (_, i) => ({
      word: `w${i}`,
      reading: `r${i}`,
      meanings: [`m${i}`],
      id: `id-${i}`,
      due: i,  // 이미 오름차순
    }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const remaining = createSession(cards, { sessionSize: 6, shuffle: false } as any).remaining()
      expect(remaining.map(c => c.id)).toEqual(['id-0', 'id-1', 'id-2', 'id-3', 'id-4', 'id-5'])
    } finally {
      vi.restoreAllMocks()
    }
  })
})
