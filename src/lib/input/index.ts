export type InputMode = 'romaji' | 'korean-pronunciation' | 'hiragana' | 'meaning'

export interface Card {
  word: string
  reading: string
  meanings: string[]
  due?: number
}

export function matchInput(_input: string, _card: Card, _mode: InputMode): boolean {
  throw new Error('not implemented')
}

export function isPrefixMatch(_input: string, _card: Card, _mode: InputMode): boolean {
  throw new Error('not implemented')
}

export function toRomaji(_kana: string): string {
  throw new Error('not implemented')
}

export function toKoreanPronunciation(_kana: string): string {
  throw new Error('not implemented')
}
