import { useState, useEffect } from 'react'
import GameBoard from './components/GameBoard'
import RegionPanel from './components/UI/RegionPanel'
import TimeControl from './components/UI/TimeControl'
import { gameState } from './game/GameState'
import { mapManager } from './game/Map'
import { demographicsSystem } from './game/Demographics'
import { characterManager } from './game/Character'
import { GameState, Region } from './game/types'
import './App.css'

function App() {
  const [gameStateData, setGameStateData] = useState<GameState>(gameState.getState())
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)

  useEffect(() => {
    // Initialize map regions in game state
    mapManager.getAllRegions().forEach(region => {
      gameState.addRegion(region)
    })

    // Initialize characters and dynasties
    const spainDynasty = characterManager.createDynasty('House of Habsburg', 'Spanish', 1600)
    const englandDynasty = characterManager.createDynasty('House of Stuart', 'English', 1600)
    const portugueseDynasty = characterManager.createDynasty('House of Braganza', 'Portuguese', 1600)

    gameState.addDynasty(spainDynasty)
    gameState.addDynasty(englandDynasty)
    gameState.addDynasty(portugueseDynasty)

    // Create starting characters
    const characters = [
      characterManager.createCharacter('Governor Cortés', 'Spanish', 'Catholic', 'Governor', 'cuba', spainDynasty.id, 45),
      characterManager.createCharacter('Lord Randolph', 'English', 'Protestant', 'Governor', 'virginia', englandDynasty.id, 40),
      characterManager.createCharacter('Captain Silva', 'Portuguese', 'Catholic', 'Governor', 'pernambuco', portugueseDynasty.id, 38),
      characterManager.createCharacter('Merchant Williamson', 'English', 'Protestant', 'Merchant', 'charleston', englandDynasty.id, 35),
      characterManager.createCharacter('Captain Drummond', 'English', 'Protestant', 'Military_Leader', 'jamaica', englandDynasty.id, 42),
    ]

    characters.forEach(char => {
      gameState.addCharacter(char)
      characterManager.addMemberToDynasty(char.dynasty_id, char.id)
    })

    // Subscribe to game state changes
    const unsubscribe = gameState.subscribe((state, events) => {
      setGameStateData({ ...state })
    })

    // Subscribe to monthly ticks for demographics updates
    const unsubscribeTick = gameState.onMonthTick(() => {
      const regions = mapManager.getAllRegions()
      demographicsSystem.processMonthTick(regions)

      // Age characters every 12 months
      if (gameStateData.current_month === 1) {
        characterManager.getAllCharacters().forEach(char => {
          if (char.is_alive) {
            characterManager.ageCharacter(char.id)
          }
        })
      }
    })

    return () => {
      unsubscribe()
      unsubscribeTick()
      gameState.destroy()
    }
  }, [])

  const selectedRegion = selectedRegionId ? mapManager.getRegion(selectedRegionId) : null

  return (
    <div className="app-container">
      <div className="game-wrapper">
        <GameBoard selectedRegionId={selectedRegionId} onRegionSelect={setSelectedRegionId} />
        <div className="ui-panel">
          <TimeControl gameState={gameStateData} />
          {selectedRegion && <RegionPanel region={selectedRegion} />}
        </div>
      </div>
    </div>
  )
}

export default App
