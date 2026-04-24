import type { Card } from './input'

function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsv(cards: Card[]): string {
  const header = 'word,reading,meaning'
  if (cards.length === 0) {
    return header
  }
  const rows = cards.map((card) => {
    const word = escapeCell(card.word)
    const reading = escapeCell(card.reading)
    const meaning = escapeCell(card.meanings.join(';'))
    return `${word},${reading},${meaning}`
  })
  return `${header}\n${rows.join('\n')}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function toPrintableHtml(cards: Card[]): string {
  const styles = `
    body { font-family: sans-serif; margin: 24px; }
    ul.items { list-style: none; padding: 0; }
    li.item { margin-bottom: 16px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; }
    .word { font-size: 1.4em; font-weight: bold; }
    .reading { color: #555; margin-left: 8px; }
    .meanings { margin-top: 6px; }
    .meaning { display: block; }
    @media print {
      body { margin: 12mm; }
      li.item { break-inside: avoid; border: none; border-bottom: 1px solid #000; border-radius: 0; }
    }
  `

  const body =
    cards.length === 0
      ? '<p class="empty">No missed items.</p>'
      : `<ul class="items">${cards
          .map((c) => {
            const word = escapeHtml(c.word)
            const reading = escapeHtml(c.reading)
            const meanings = c.meanings
              .map((m) => `<span class="meaning">${escapeHtml(m)}</span>`)
              .join('')
            return `<li class="item"><span class="word">${word}</span><span class="reading">${reading}</span><div class="meanings">${meanings}</div></li>`
          })
          .join('')}</ul>`

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>MISSED CARDS</title>
<style>${styles}</style>
</head>
<body>
${body}
</body>
</html>`
}
