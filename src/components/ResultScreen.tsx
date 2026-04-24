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
    <div className="result-screen">
      <div className="result-screen__inner">
        <h2 className="result-screen__title">RESULT</h2>

        {wrongCards.length === 0 && (
          <div className="perfect-message" data-testid="perfect-message">⚡ PERFECT ⚡</div>
        )}

        <div className="result-stats">
          <div className="result-stat">
            <span className="result-stat__label">SCORE</span>
            <span className="result-stat__value" data-testid="result-score">{score}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat__label">ACCURACY</span>
            <span className="result-stat__value" data-testid="result-accuracy">{accuracy}%</span>
          </div>
          <div className="result-stat">
            <span className="result-stat__label">CORRECT</span>
            <span className="result-stat__value">{correctCount} / {totalCount}</span>
          </div>
        </div>

        {wrongCards.length > 0 && (
          <div className="wrong-cards">
            <div className="wrong-cards__label">MISSED CARDS</div>
          </div>
        )}
        <div data-testid="wrong-cards-list" className={wrongCards.length > 0 ? 'wrong-cards__items' : ''}>
          {wrongCards.map((card) => (
            <div key={card.word} className="wrong-card" data-testid="wrong-card-item">
              <span className="wrong-card__word">{card.word}</span>
              <span className="wrong-card__reading">{card.reading}</span>
              <span className="wrong-card__meaning">{card.meanings[0]}</span>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={onRestart}>다시하기</button>
      </div>
    </div>
  )
}
