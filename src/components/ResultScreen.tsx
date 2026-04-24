import type React from 'react'
import type { GameResult } from '../types'

interface Props {
  result: GameResult
  onRestart: () => void
}

export function ResultScreen({ result, onRestart }: Props): React.JSX.Element {
  const { score, correctCount, totalCount, wrongCards } = result
  const accuracy = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100)

  return (
    <div>
      <div data-testid="result-score">{score}</div>
      <div data-testid="result-accuracy">{accuracy}%</div>

      {wrongCards.length === 0 && (
        <div data-testid="perfect-message">퍼펙트!</div>
      )}

      <div data-testid="wrong-cards-list">
        {wrongCards.map((card) => (
          <div key={card.word} data-testid="wrong-card-item">
            <span>{card.word}</span>
            <span>{card.reading}</span>
            <span>{card.meanings[0]}</span>
          </div>
        ))}
      </div>

      <button onClick={onRestart}>다시하기</button>
    </div>
  )
}
