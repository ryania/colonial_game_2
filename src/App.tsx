import { useState, useEffect } from 'react'
import GameBoard from './components/GameBoard'
import RegionPanel from './components/UI/RegionPanel'
import TimeControl from './components/UI/TimeControl'
import { PlayerCharacter } from './components/UI/PlayerCharacter'
import { FocusedCharacters } from './components/UI/FocusedCharacters'
import { CharacterSelect } from './components/UI/CharacterSelect'
import { CharacterDeath } from './components/UI/CharacterDeath'
import { gameState } from './game/GameState'
import { mapManager } from './game/Map'
import { demographicsSystem } from './game/Demographics'
import { characterManager } from './game/Character'
import { characterGenerator } from './game/CharacterGenerator'
import { successionSystem } from './game/Succession'
import { characterSwitchingSystem } from './game/CharacterSwitching'
import { GameState, Region, Character } from './game/types'
import './App.css'

function App() {
  const [gameStateData, setGameStateData] = useState<GameState>(gameState.getState())
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [showCharacterSelect, setShowCharacterSelect] = useState(true)
  const [deathData, setDeathData] = useState<{
    deadCharacter: Character
    heir: Character | null
    alternatives: Character[]
  } | null>(null)
  const [gameOver, setGameOver] = useState(false)

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

    // Create starting characters with class system
    const characters: Character[] = []

    // Historical characters with class-based attributes
    const historicalChars = [
      {
        name: 'Governor Cortés',
        class: 'governor' as const,
        culture: 'Spanish' as const,
        region_id: 'cuba',
        dynasty_id: spainDynasty.id,
        age: 45
      },
      {
        name: 'Lord Randolph',
        class: 'diplomat' as const,
        culture: 'English' as const,
        region_id: 'virginia',
        dynasty_id: englandDynasty.id,
        age: 40
      },
      {
        name: 'Captain Silva',
        class: 'military' as const,
        culture: 'Portuguese' as const,
        region_id: 'pernambuco',
        dynasty_id: portugueseDynasty.id,
        age: 38
      },
      {
        name: 'Merchant Williamson',
        class: 'merchant' as const,
        culture: 'English' as const,
        region_id: 'charleston',
        dynasty_id: englandDynasty.id,
        age: 35
      },
      {
        name: 'Captain Drummond',
        class: 'military' as const,
        culture: 'English' as const,
        region_id: 'jamaica',
        dynasty_id: englandDynasty.id,
        age: 42
      },
    ]

    // Generate characters with class system
    historicalChars.forEach(spec => {
      const char = characterGenerator.generateRandomCharacter({
        class: spec.class,
        name: spec.name,
        culture: spec.culture,
        region_id: spec.region_id,
        age: spec.age,
        randomize: false
      })
      char.dynasty_id = spec.dynasty_id
      characters.push(char)
    })

    characters.forEach(char => {
      gameState.addCharacter(char)
      characterManager.addMemberToDynasty(char.dynasty_id, char.id)
    })

    // Subscribe to game state changes
    const unsubscribe = gameState.subscribe((state, events) => {
      setGameStateData({ ...state })
    })

    // Subscribe to monthly ticks for demographics and character updates
    const unsubscribeTick = gameState.onMonthTick(() => {
      const regions = mapManager.getAllRegions()
      demographicsSystem.processMonthTick(regions)

      const allCharacters = gameState.getState().characters

      // Age characters every 12 months and check for deaths
      if (gameStateData.current_month === 1) {
        allCharacters.forEach(char => {
          if (char.is_alive) {
            char.age++

            // Natural death chance increases with age
            // ~1% chance at age 50, ~5% at age 70, ~20% at age 90+
            const deathChance = Math.pow((char.age - 40) / 50, 2) * 0.3
            if (Math.random() < deathChance && char.age > 50) {
              char.is_alive = false
              char.death_year = gameStateData.current_year

              // Check if this is the player character
              const playerChar = gameState.getPlayerCharacter()
              if (playerChar && playerChar.id === char.id) {
                // Show succession UI
                const heir = successionSystem.determineSurvivor(char, allCharacters)
                const alternatives = successionSystem.getPlayableAlternatives(char, allCharacters)

                setDeathData({
                  deadCharacter: char,
                  heir,
                  alternatives: alternatives.filter(alt => alt.id !== char.id)
                })
              }
            }
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
  const playerCharacter = gameState.getPlayerCharacter()
  const focusedCharacters = gameState.getFocusedCharacters()

  const handleCharacterSelect = (character: Character) => {
    // Add to game if not already there (for generated characters)
    if (!gameState.getCharacter(character.id)) {
      gameState.addCharacter(character)
    }
    gameState.setPlayerCharacter(character.id)
    setShowCharacterSelect(false)
  }

  const handleCharacterSwitch = (character: Character) => {
    if (gameState.switchPlayerCharacter(character.id)) {
      setShowCharacterSelect(false)
    }
  }

  const handleHeirSelected = (heir: Character) => {
    gameState.switchPlayerCharacter(heir.id)
    setDeathData(null)
  }

  const handleAlternativeSelected = (alt: Character) => {
    gameState.switchPlayerCharacter(alt.id)
    setDeathData(null)
  }

  const handleLoadSave = () => {
    // TODO: Implement save/load system
    alert('Save/load system coming soon')
  }

  const handleGameOver = () => {
    setGameOver(true)
  }

  if (gameOver) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="bg-slate-900 border-4 border-red-700 rounded-lg p-8 text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h1>
          <p className="text-white text-lg mb-6">Your dynasty has fallen.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-amber-700 hover:bg-amber-600 text-white px-8 py-3 rounded font-bold text-lg transition-colors"
          >
            RESTART GAME
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {showCharacterSelect && (
        <CharacterSelect
          characters={gameState.getState().characters}
          onSelect={handleCharacterSelect}
        />
      )}

      {deathData && (
        <CharacterDeath
          deadCharacter={deathData.deadCharacter}
          heir={deathData.heir}
          alternatives={deathData.alternatives}
          onSelectHeir={handleHeirSelected}
          onSelectAlternative={handleAlternativeSelected}
          onLoadSave={handleLoadSave}
          onGameOver={handleGameOver}
        />
      )}

      <div className="game-wrapper">
        <GameBoard selectedRegionId={selectedRegionId} onRegionSelect={setSelectedRegionId} />
        <div className="ui-panel">
          <TimeControl gameState={gameStateData} />
          {playerCharacter && (
            <PlayerCharacter
              character={playerCharacter}
              onSwitchClick={() => setShowCharacterSelect(true)}
              onViewProfile={() => {
                // TODO: Implement profile view
              }}
            />
          )}
          {playerCharacter && focusedCharacters.length > 0 && (
            <FocusedCharacters
              focusedCharacters={focusedCharacters}
              playerCharacterId={playerCharacter.id}
              allCharacters={gameStateData.characters}
              onSelectCharacter={handleCharacterSwitch}
              onRemoveFocus={characterId => gameState.removeFocusCharacter(characterId)}
              onAddFocus={char => gameState.addFocusCharacter(char.id)}
            />
          )}
          {selectedRegion && <RegionPanel region={selectedRegion} />}
        </div>
      </div>
    </div>
  )
}

export default App
