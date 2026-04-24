import type { Card } from '../input'

export function stripHtml(html: string): string {
  // Replace <br> and <br/> with space
  let result = html.replace(/<br\s*\/?>/gi, ' ')
  // Replace opening and closing div tags with space
  result = result.replace(/<\/?div[^>]*>/gi, ' ')
  // Remove all remaining tags
  result = result.replace(/<[^>]+>/g, '')
  // Collapse multiple spaces and trim
  result = result.replace(/\s+/g, ' ').trim()
  return result
}

export function splitMeanings(text: string): string[] {
  return text
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

export function extractCardFields(raw: { front: string; back: string }): Card {
  const { front, back } = raw

  // Parse back: text before first tag = word, text inside first tag = reading
  const tagMatch = back.match(/^([^<]*)<[^>]+>(.*?)<\/[^>]+>/)
  const brMatch = back.match(/^([^<]*)<br\s*\/?>(.*)/i)

  let word: string
  let reading: string

  if (tagMatch) {
    word = tagMatch[1].trim()
    reading = tagMatch[2].trim()
  } else if (brMatch) {
    word = brMatch[1].trim()
    reading = brMatch[2].trim()
  } else {
    word = back.trim()
    reading = ''
  }

  // Clean front field
  const cleanFront = stripHtml(front)
  const meanings = splitMeanings(cleanFront)

  return { word, reading, meanings }
}

export async function parseApkg(buffer: ArrayBuffer): Promise<Card[]> {
  const { unzipSync } = await import('fflate')

  const uint8 = new Uint8Array(buffer)
  const files = unzipSync(uint8)

  // Find database file: prefer anki21b (zstd), then anki21, then anki2
  let dbData: Uint8Array | null = null

  if (files['collection.anki21b']) {
    // zstd compressed
    const { init, decompress } = await import('@bokuweb/zstd-wasm')
    await init()
    dbData = decompress(files['collection.anki21b'], { defaultHeapSize: 128 * 1024 * 1024 })
  } else if (files['collection.anki21']) {
    dbData = files['collection.anki21']
  } else if (files['collection.anki2']) {
    dbData = files['collection.anki2']
  }

  if (!dbData) {
    throw new Error('No valid collection database found in .apkg')
  }

  // Load sql.js
  const { createRequire } = await import('module')
  const req = createRequire(import.meta.url)
  const sqlJsWasmPath: string = req.resolve('sql.js/dist/sql-wasm.wasm')
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs({ locateFile: () => sqlJsWasmPath })

  const db = new SQL.Database(dbData)

  const results = db.exec('SELECT flds FROM notes')
  if (!results.length) {
    db.close()
    return []
  }

  const cards: Card[] = []
  for (const [index, row] of results[0].values.entries()) {
    const flds = row[0] as string
    const parts = flds.split('\x1f')
    if (parts.length >= 2) {
      const card = extractCardFields({ front: parts[0], back: parts[1] })
      if (card.word) {
        cards.push({ ...card, id: `note-${index}` })
      }
    }
  }

  db.close()
  return cards
}
