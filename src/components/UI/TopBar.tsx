import React, { memo, useMemo } from 'react'
import { GameState, Character } from '../../game/types'
import { gameState as gameStateManager } from '../../game/GameState'
import './TopBar.css'

interface TopBarProps {
  gameState: GameState
  playerCharacter: Character | undefined
  onMenuToggle: () => void
}

const TopBarComponent: React.FC<TopBarProps> = ({ gameState, playerCharacter, onMenuToggle }) => {
  const formattedDate = useMemo(() => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return `${months[gameState.current_month - 1]} ${gameState.current_year}`
  }, [gameState.current_month, gameState.current_year])

  return (
    <div className="top-bar">
      {/* Left: Character Portrait */}
      <div className="top-bar-left">
        <button className="character-portrait" onClick={onMenuToggle} title="Click to open character menu">
          {playerCharacter ? '👤' : '❓'}
        </button>
      </div>

      {/* Center: Date and Time Controls */}
      <div className="top-bar-center">
        <div className="date-display">{formattedDate}</div>
        <div className="time-controls">
          <button
            className="control-btn"
            onClick={() => gameStateManager.togglePause()}
            title={gameState.is_paused ? 'Play' : 'Pause'}
          >
            {gameState.is_paused ? '▶' : '⏸'}
          </button>
          <select
            className="speed-select"
            value={gameState.game_speed}
            onChange={(e) => gameStateManager.setGameSpeed(parseFloat(e.target.value))}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
      </div>

      {/* Right: KPIs */}
      <div className="top-bar-right">
        {playerCharacter && (
          <>
            <div className="kpi-item">
              <span className="kpi-label">Prestige</span>
              <span className="kpi-value">{playerCharacter.prestige}</span>
            </div>
            <div className="kpi-item">
              <span className="kpi-label">Wealth</span>
              <span className="kpi-value">{playerCharacter.wealth}</span>
            </div>
            <div className="kpi-item">
              <span className="kpi-label">Health</span>
              <span className="kpi-value">{playerCharacter.health}%</span>
            </div>
            <div className="kpi-item">
              <span className="kpi-label">Relations</span>
              <span className="kpi-value">{playerCharacter.relationship_ids?.length || 0}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const TopBar = memo(TopBarComponent)
