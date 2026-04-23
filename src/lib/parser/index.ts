import type { Card } from '../input'

export async function parseApkg(_buffer: ArrayBuffer): Promise<Card[]> {
  throw new Error('not implemented')
}

export function extractCardFields(_raw: { front: string; back: string }): Card {
  throw new Error('not implemented')
}

export function stripHtml(_html: string): string {
  throw new Error('not implemented')
}

export function splitMeanings(_text: string): string[] {
  throw new Error('not implemented')
}
