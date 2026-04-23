export type InputMode = 'romaji' | 'korean-pronunciation' | 'hiragana' | 'meaning'

export interface Card {
  word: string
  reading: string
  meanings: string[]
  due?: number
}

// Hiragana to romaji mapping
const hiraganaToRomaji: Record<string, string> = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'ゐ': 'i', 'ゑ': 'e', 'を': 'wo',
  'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
}

// Katakana to hiragana conversion
function katakanaToHiragana(str: string): string {
  return str.replace(/[ァ-ヶ]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  )
}

export function toRomaji(kana: string): string {
  // Convert katakana to hiragana first
  let str = katakanaToHiragana(kana)
  let result = ''
  let i = 0

  while (i < str.length) {
    const ch = str[i]

    // Handle っ/ッ (sokuon - double consonant)
    if (ch === 'っ') {
      // Look ahead for next character's romaji and double its first consonant
      const next2 = hiraganaToRomaji[str[i + 1] + str[i + 2]]
      const next1 = hiraganaToRomaji[str[i + 1]]
      const nextRomaji = next2 || next1
      if (nextRomaji) {
        result += nextRomaji[0]
      }
      i++
      continue
    }

    // Handle ー (long vowel) - repeat previous vowel
    if (ch === 'ー') {
      // find last vowel in result
      const lastVowelMatch = result.match(/[aeiou](?=[^aeiou]*$)/)
      if (lastVowelMatch) {
        result += lastVowelMatch[0]
      }
      i++
      continue
    }

    // Try 2-char compound first
    if (i + 1 < str.length) {
      const compound = str[i] + str[i + 1]
      if (hiraganaToRomaji[compound]) {
        result += hiraganaToRomaji[compound]
        i += 2
        continue
      }
    }

    // Single char
    if (hiraganaToRomaji[ch]) {
      result += hiraganaToRomaji[ch]
    } else {
      result += ch
    }
    i++
  }

  return result
}

// Hiragana to Korean pronunciation mapping
const hiraganaToKorean: Record<string, string> = {
  'あ': '아', 'い': '이', 'う': '우', 'え': '에', 'お': '오',
  'か': '카', 'き': '키', 'く': '쿠', 'け': '케', 'こ': '코',
  'さ': '사', 'し': '시', 'す': '스', 'せ': '세', 'そ': '소',
  'た': '타', 'ち': '치', 'つ': '츠', 'て': '테', 'と': '토',
  'な': '나', 'に': '니', 'ぬ': '누', 'ね': '네', 'の': '노',
  'は': '하', 'ひ': '히', 'ふ': '후', 'へ': '헤', 'ほ': '호',
  'ま': '마', 'み': '미', 'む': '무', 'め': '메', 'も': '모',
  'や': '야', 'ゆ': '유', 'よ': '요',
  'ら': '라', 'り': '리', 'る': '루', 'れ': '레', 'ろ': '로',
  'わ': '와', 'を': '오',
  'ん': '응',
  'が': '가', 'ぎ': '기', 'ぐ': '구', 'げ': '게', 'ご': '고',
  'ざ': '자', 'じ': '지', 'ず': '즈', 'ぜ': '제', 'ぞ': '조',
  'だ': '다', 'ぢ': '지', 'づ': '즈', 'で': '데', 'ど': '도',
  'ば': '바', 'び': '비', 'ぶ': '부', 'べ': '베', 'ぼ': '보',
  'ぱ': '파', 'ぴ': '피', 'ぷ': '푸', 'ぺ': '페', 'ぽ': '포',
  'きゃ': '캬', 'きゅ': '큐', 'きょ': '쿄',
  'しゃ': '샤', 'しゅ': '슈', 'しょ': '쇼',
  'ちゃ': '차', 'ちゅ': '추', 'ちょ': '초',
  'にゃ': '냐', 'にゅ': '뉴', 'にょ': '뇨',
  'ひゃ': '햐', 'ひゅ': '휴', 'ひょ': '효',
  'みゃ': '먀', 'みゅ': '뮤', 'みょ': '묘',
  'りゃ': '랴', 'りゅ': '류', 'りょ': '료',
  'ぎゃ': '갸', 'ぎゅ': '규', 'ぎょ': '교',
  'じゃ': '쟈', 'じゅ': '쥬', 'じょ': '죠',
  'びゃ': '뱌', 'びゅ': '뷰', 'びょ': '뵤',
  'ぴゃ': '퍄', 'ぴゅ': '퓨', 'ぴょ': '표',
}

export function toKoreanPronunciation(kana: string): string {
  // Convert katakana to hiragana first
  let str = katakanaToHiragana(kana)
  let result = ''
  let i = 0

  while (i < str.length) {
    const ch = str[i]

    // Handle っ (sokuon)
    if (ch === 'っ') {
      i++
      continue
    }

    // Handle ー (long vowel) - skip in Korean pronunciation
    if (ch === 'ー') {
      i++
      continue
    }

    // Try 2-char compound first
    if (i + 1 < str.length) {
      const compound = str[i] + str[i + 1]
      if (hiraganaToKorean[compound]) {
        result += hiraganaToKorean[compound]
        i += 2
        continue
      }
    }

    // Single char
    if (hiraganaToKorean[ch]) {
      result += hiraganaToKorean[ch]
    } else {
      result += ch
    }
    i++
  }

  return result
}

function getAnswer(card: Card, mode: InputMode): string | string[] {
  switch (mode) {
    case 'romaji':
      return toRomaji(card.reading)
    case 'korean-pronunciation':
      return toKoreanPronunciation(card.reading)
    case 'hiragana':
      return card.reading
    case 'meaning':
      return card.meanings
  }
}

export function matchInput(input: string, card: Card, mode: InputMode): boolean {
  const answer = getAnswer(card, mode)
  const normalInput = input.trim().toLowerCase()

  if (Array.isArray(answer)) {
    return answer.some(a => a.trim().toLowerCase() === normalInput)
  }

  return answer.toLowerCase() === normalInput
}

export function isPrefixMatch(input: string, card: Card, mode: InputMode): boolean {
  const answer = getAnswer(card, mode)
  const normalInput = input.toLowerCase()

  if (Array.isArray(answer)) {
    return answer.some(a => a.toLowerCase().startsWith(normalInput))
  }

  return answer.toLowerCase().startsWith(normalInput)
}
