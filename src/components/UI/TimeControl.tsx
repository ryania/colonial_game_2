import { GameState } from '../../game/types'
import { gameState } from '../../game/GameState'
import './TimeControl.css'

interface TimeControlProps {
  gameState: GameState
}

export default function TimeControl({ gameState: state }: TimeControlProps) {
  const handlePlayPause = () => {
    gameState.togglePause()
  }

  const handleSpeedChange = (speed: number) => {
    gameState.setGameSpeed(speed)
  }

  return (
    <div className="time-control">
      <div className="date-display">
        <div className="label">Date</div>
        <div className="date">{gameState.getFormattedDate()}</div>
      </div>

      <div className="controls">
        <button
          className={`play-pause-btn ${state.is_paused ? 'paused' : 'playing'}`}
          onClick={handlePlayPause}
        >
          {state.is_paused ? '▶ Play' : '⏸ Pause'}
        </button>
      </div>

      <div className="speed-controls">
        <div className="label">Speed</div>
        <div className="speed-buttons">
          {[0.5, 1, 2, 4].map(speed => (
            <button
              key={speed}
              className={`speed-btn ${state.game_speed === speed ? 'active' : ''}`}
              onClick={() => handleSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="game-stats">
        <div className="stat">
          <span className="label">Regions:</span>
          <span className="value">{state.regions.length}</span>
        </div>
        <div className="stat">
          <span className="label">Population:</span>
          <span className="value">
            {Math.round(state.regions.reduce((sum, r) => sum + r.population.total, 0) / 1000)}k
          </span>
        </div>
        <div className="stat">
          <span className="label">Total Wealth:</span>
          <span className="value">
            {Math.round(state.regions.reduce((sum, r) => sum + r.wealth, 0))}
          </span>
        </div>
      </div>
    </div>
  )
}
