import type React from 'react'
import type { GameResult } from '../types'

interface Props {
  result: GameResult
  onRestart: () => void
  onReviewWrong?: () => void
}

function getCardKey(card: GameResult['wrongCards'][number]): string {
  return card.id ?? `${card.word}\u001f${card.reading}\u001f${card.meanings.join('\u001e')}`
}

export function ResultScreen({ result, onRestart, onReviewWrong }: Props): React.JSX.Element {
  const { score, correctCount, totalCount, wrongCards } = result
  const firstPassCorrect = Math.max(0, totalCount - wrongCards.length)
  const accuracy = totalCount === 0 ? 0 : Math.round((firstPassCorrect / totalCount) * 100)

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
            <div className="wrong-cards__title">MISSED CARDS</div>
            <div className="wrong-cards__list" data-testid="wrong-cards-list">
              {wrongCards.map((card) => (
                <div key={getCardKey(card)} className="wrong-card" data-testid="wrong-card-item">
                  <span className="wrong-card__word">{card.word}</span>
                  <span className="wrong-card__reading">{card.reading}</span>
                  <span className="wrong-card__meaning">{card.meanings[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="result-actions">
          {wrongCards.length > 0 && onReviewWrong && (
            <button className="btn-primary" onClick={onReviewWrong}>Review Missed</button>
          )}
          <button className="btn-primary" onClick={onRestart}>다시하기</button>
        </div>
      </div>
    </div>
  )
}
