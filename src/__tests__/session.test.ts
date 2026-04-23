import { describe, it, expect, beforeEach } from 'vitest'
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

  it('due 값이 있으면 오름차순으로 정렬한다', () => {
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
})

describe('session.markCorrect', () => {
  it('맞힌 카드를 큐에서 제거한다', () => {
    const session = createSession(makeCards(5), { sessionSize: 5 })
    const card = session.remaining()[0]
    const before = session.remaining().length
    session.markCorrect(card)
    expect(session.remaining().length).toBe(before - 1)
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
