import { useState, useEffect } from 'react'
import GameBoard from './components/GameBoard'
import RegionPanel from './components/UI/RegionPanel'
import TimeControl from './components/UI/TimeControl'
import { TopBar } from './components/UI/TopBar'
import { MenuContainer } from './components/UI/MenuContainer'
import { PlayerCharacter } from './components/UI/PlayerCharacter'
import { FocusedCharacters } from './components/UI/FocusedCharacters'
import { CharacterSelect } from './components/UI/CharacterSelect'
import { CharacterDeath } from './components/UI/CharacterDeath'
import { ErrorModal } from './components/UI/ErrorModal'
import { StartMenu } from './components/UI/StartMenu'
import { gameState } from './game/GameState'
import { menuManager } from './game/MenuManager'
import { mapManager, initializeMapManager } from './game/Map'
import { demographicsSystem } from './game/Demographics'
import { characterManager } from './game/Character'
import { characterGenerator } from './game/CharacterGenerator'
import { successionSystem } from './game/Succession'
import { characterSwitchingSystem } from './game/CharacterSwitching'
import { GameState, Region, Character } from './game/types'
import './App.css'

function App() {
  const [showStartMenu, setShowStartMenu] = useState(true)
  const [gameInitialized, setGameInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [gameStateData, setGameStateData] = useState<GameState>(gameState.getState())
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [showCharacterSelect, setShowCharacterSelect] = useState(false)
  const [deathData, setDeathData] = useState<{
    deadCharacter: Character
    heir: Character | null
    alternatives: Character[]
  } | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [errorData, setErrorData] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    // Only run initialization when game is started
    if (!gameInitialized || isInitializing) return

    const runInitialization = async () => {
      setIsInitializing(true)
      try {
        // Asynchronously initialize map regions from JSON
        await initializeMapManager()

        // Initialize map regions in game state
        try {
          mapManager.getAllRegions().forEach(region => {
            gameState.addRegion(region)
          })
        } catch (err) {
          throw new Error(`Failed to initialize map regions: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }

        // Initialize characters and dynasties
        try {
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
            if (!char) {
              throw new Error(`Failed to generate character: ${spec.name}`)
            }
            char.dynasty_id = spec.dynasty_id
            characters.push(char)
          })

          if (characters.length === 0) {
            throw new Error('No characters were created during initialization')
          }

          characters.forEach(char => {
            gameState.addCharacter(char)
            // Validate dynasty_id before adding to dynasty
            const dynasty = gameState.getState().dynasties.find(d => d.id === char.dynasty_id)
            if (!dynasty) {
              throw new Error(`Invalid dynasty_id for character ${char.name}: ${char.dynasty_id}`)
            }
            characterManager.addMemberToDynasty(char.dynasty_id, char.id)
          })

          // Set player character to first character
          if (!gameState.setPlayerCharacter(characters[0].id)) {
            throw new Error(`Failed to set player character: ${characters[0].name}`)
          }

          // Show character select now that initialization is complete
          setShowCharacterSelect(true)
        } catch (err) {
          throw new Error(`Failed to initialize characters and dynasties: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }

        // Subscribe to game state changes
        const unsubscribe = gameState.subscribe((state, events) => {
          setGameStateData({ ...state })
        })

        // Subscribe to monthly ticks for demographics and character updates
        // Now receives current game state as parameter instead of using stale closure
        const unsubscribeTick = gameState.onMonthTick((currentState) => {
          const regions = mapManager.getAllRegions()
          demographicsSystem.processMonthTick(regions)

          const allCharacters = currentState.characters

          // Age characters every 12 months and check for deaths
          if (currentState.current_month === 1) {
            allCharacters.forEach(char => {
              if (char.is_alive) {
                char.age++

                // Natural death chance increases with age
                // ~1% chance at age 50, ~5% at age 70, ~20% at age 90+
                const deathChance = Math.pow((char.age - 40) / 50, 2) * 0.3
                if (Math.random() < deathChance && char.age > 50) {
                  char.is_alive = false
                  char.death_year = currentState.current_year

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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error during game initialization'
        setErrorData({
          title: 'Game Initialization Error',
          message: errorMessage
        })
      } finally {
        setIsInitializing(false)
      }
    }

    runInitialization()
  }, [gameInitialized])

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

  const handleStartMenuNewGame = () => {
    setShowStartMenu(false)
    setGameInitialized(true)
  }

  const handleStartMenuLoadGame = () => {
    alert('Save/load system coming in v3.4')
  }

  const handleStartMenuSettings = () => {
    // Settings modal handles its own display
  }

  const handleStartMenuCredits = () => {
    // Credits modal handles its own display
  }

  if (showStartMenu) {
    return (
      <StartMenu
        onNewGame={handleStartMenuNewGame}
        onLoadGame={handleStartMenuLoadGame}
        onSettings={handleStartMenuSettings}
        onCredits={handleStartMenuCredits}
      />
    )
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

  // Handle region selection - automatically open province menu
  const handleRegionSelect = (regionId: string) => {
    setSelectedRegionId(regionId)
    menuManager.openMenu('province', regionId)
    setIsMenuOpen(true)
  }

  // Handle character portrait click
  const handlePortraitClick = () => {
    if (isMenuOpen && gameStateData.active_menu === 'character') {
      setIsMenuOpen(false)
      menuManager.closeMenu()
    } else {
      setIsMenuOpen(true)
      menuManager.openMenu('character')
    }
  }

  return (
    <div className="app-container">
      {errorData && (
        <ErrorModal
          title={errorData.title}
          message={errorData.message}
          onClose={() => setErrorData(null)}
        />
      )}

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

      {/* Top Bar with Date/Time and KPIs */}
      <div className="top-bar-wrapper">
        <TopBar
          gameState={gameStateData}
          playerCharacter={playerCharacter}
          onMenuToggle={handlePortraitClick}
        />
      </div>

      {/* Main Game Wrapper */}
      <div className="game-wrapper">
        {/* Left: Menu Container */}
        {isMenuOpen && (
          <div className="menu-container-wrapper">
            <MenuContainer
              menuManager={menuManager}
              gameState={gameStateData}
              onClose={() => {
                setIsMenuOpen(false)
                menuManager.closeMenu()
              }}
              onCharacterSelect={handleCharacterSwitch}
            />
          </div>
        )}

        {/* Center: Game Canvas */}
        <GameBoard selectedRegionId={selectedRegionId} onRegionSelect={handleRegionSelect} />
      </div>
    </div>
  )
}

export default App
