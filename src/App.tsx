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
import { LoadingScreen } from './components/UI/LoadingScreen'
import { MapModeSelector } from './components/UI/MapModeSelector'
import { gameState } from './game/GameState'
import { menuManager } from './game/MenuManager'
import { mapManager, initializeMapManager } from './game/Map'
import { demographicsSystem } from './game/Demographics'
import { characterManager } from './game/Character'
import { characterGenerator } from './game/CharacterGenerator'
import { successionSystem } from './game/Succession'
import { characterSwitchingSystem } from './game/CharacterSwitching'
import { ProvinceGenerator } from './game/ProvinceGenerator'
import { governanceSystem } from './game/GovernanceSystem'
import { stateOwnerSystem } from './game/StateOwnerSystem'
import { tradeSystem } from './game/TradeSystem'
import {
  PathfindingGraph,
  computeClusterAssignments,
  computeClusterRoutes,
} from './game/Pathfinding'
import { GameState, Region, Character, MapMode, SuccessionLaw } from './game/types'
import './App.css'

function App() {
  const [showStartMenu, setShowStartMenu] = useState(true)
  const [gameInitialized, setGameInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isMapInitialized, setIsMapInitialized] = useState(false)
  const [gameStateData, setGameStateData] = useState<GameState>(gameState.getState())
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [showCharacterSelect, setShowCharacterSelect] = useState(false)
  const [deathData, setDeathData] = useState<{
    deadCharacter: Character
    heir: Character | null
    alternatives: Character[]
    gavelkindCoHeirs?: Character[]
  } | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [errorData, setErrorData] = useState<{ title: string; message: string } | null>(null)
  const [mapMode, setMapMode] = useState<MapMode>('terrain')
  const [adoptionPool, setAdoptionPool] = useState<Character[]>([])
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [isMapRendered, setIsMapRendered] = useState(false)

  useEffect(() => {
    // Only run initialization when game is started
    if (!gameInitialized || isInitializing) return

    const runInitialization = async () => {
      setIsInitializing(true)
      setLoadingProgress(0)
      setLoadingMessage('Preparing the New World...')
      try {
        // Asynchronously initialize map regions from JSON
        setLoadingProgress(5)
        setLoadingMessage('Loading map data...')
        console.log('Starting map initialization...')
        await initializeMapManager()
        console.log('Map initialized, setting isMapInitialized to true')
        console.log('Regions available:', mapManager.getAllRegions().length)
        setLoadingProgress(35)
        setLoadingMessage('Charting territories...')
        setIsMapInitialized(true)

        // Initialize map regions in game state
        try {
          mapManager.getAllRegions().forEach(region => {
            gameState.addRegion(region)
          })
          setLoadingProgress(50)
          setLoadingMessage('Populating the colonies...')

          // Generate initial pop groups from province data
          const allRegions = mapManager.getAllRegions()
          const initialPops = allRegions.flatMap(r => ProvinceGenerator.generatePopsForRegion(r))
          gameState.setPops(initialPops)
          console.log('Pops initialized:', initialPops.length, 'pop groups across', allRegions.length, 'regions')
          setLoadingProgress(62)
          setLoadingMessage('Establishing governance structures...')

          // Initialize colonial governance entities
          const entities = governanceSystem.initializeEntities(allRegions)
          entities.forEach(entity => {
            gameState.addColonialEntity(entity)
            entity.region_ids.forEach(rid => {
              gameState.updateRegion(rid, { colonial_entity_id: entity.id })
            })
          })
          console.log('Governance entities initialized:', entities.length)
          setLoadingProgress(72)
          setLoadingMessage('Recognizing sovereign powers...')

          // Initialize sovereign state owners
          const stateOwners = stateOwnerSystem.initializeOwners()
          stateOwners.forEach(owner => {
            gameState.addStateOwner(owner)
            // Link each colonial entity to its sovereign owner
            owner.colonial_entity_ids.forEach(eid => {
              gameState.updateColonialEntity(eid, { state_owner_id: owner.id })
            })
            // Stamp state_owner_id on all home (European/homeland) regions directly
            owner.home_region_ids.forEach(rid => {
              gameState.updateRegion(rid, { state_owner_id: owner.id })
            })
          })
          console.log('State owners initialized:', stateOwners.length)

          // Initialize trade clusters from province geographic data
          const namedRegions = gameState.getState().regions
          const clusters = tradeSystem.initializeClusters(namedRegions)
          clusters.forEach(c => gameState.addTradeCluster(c))
          setLoadingProgress(76)
          setLoadingMessage('Charting trade winds and sea routes...')

          // Build pathfinding graph from all map tiles (~460K nodes)
          // Ocean current directional bonuses are baked into edge costs.
          console.time('[Pathfinding] graph build')
          const allRegionsForPathfinding = mapManager.getAllRegions()
          const pathfindingGraph = PathfindingGraph.build(allRegionsForPathfinding)
          console.timeEnd('[Pathfinding] graph build')
          console.log('[Pathfinding] graph nodes:', pathfindingGraph.nodeCount)

          // Province → cluster assignment via multi-source Dijkstra from cluster anchors
          console.time('[Pathfinding] cluster assignment')
          const assignmentMap = computeClusterAssignments(pathfindingGraph, namedRegions, clusters)
          tradeSystem.applyClusterAssignments(namedRegions, assignmentMap)
          console.timeEnd('[Pathfinding] cluster assignment')

          // Pre-compute cheapest inter-cluster routes (used monthly for trade flows)
          // Ocean current costs in the graph make historically correct routes cheaper.
          console.time('[Pathfinding] inter-cluster routes')
          const interClusterRoutes = computeClusterRoutes(pathfindingGraph, clusters)
          tradeSystem.setInterClusterRoutes(interClusterRoutes)
          console.timeEnd('[Pathfinding] inter-cluster routes')
          console.log('[Pathfinding] inter-cluster routes:', interClusterRoutes.size)

          // Run first monthly trade pass so values are populated immediately
          const { clusters: initialClusters, flows: initialFlows, routes: initialRoutes } =
            tradeSystem.processMonthlyTrade(gameState.getState())
          gameState.setTradeClusters(initialClusters)
          gameState.setTradeFlows(initialFlows)
          gameState.setTradeRoutes(initialRoutes)
          console.log('Trade clusters:', clusters.length, '| initial flows:', initialFlows.length)
        } catch (err) {
          throw new Error(`Failed to initialize map regions: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }

        // Initialize characters and dynasties
        setLoadingProgress(80)
        setLoadingMessage('Convening royal dynasties...')
        try {
          const spainDynasty = characterManager.createDynasty('House of Habsburg', 'Spanish', 1600)
          const englandDynasty = characterManager.createDynasty('House of Stuart', 'English', 1600)
          const portugueseDynasty = characterManager.createDynasty('House of Braganza', 'Portuguese', 1600)

          gameState.addDynasty(spainDynasty)
          gameState.addDynasty(englandDynasty)
          gameState.addDynasty(portugueseDynasty)

          // Link ruling dynasties to their state owners
          gameState.updateStateOwner('spanish_empire',      { dynasty_id: spainDynasty.id })
          gameState.updateStateOwner('kingdom_of_england',  { dynasty_id: englandDynasty.id })
          gameState.updateStateOwner('kingdom_of_portugal', { dynasty_id: portugueseDynasty.id })

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

          setLoadingProgress(88)
          setLoadingMessage('Appointing colonial governors...')
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

          setLoadingProgress(96)
          setLoadingMessage('Finalizing world state...')
          // Set player character to first character
          if (!gameState.setPlayerCharacter(characters[0].id)) {
            throw new Error(`Failed to set player character: ${characters[0].name}`)
          }

          setLoadingProgress(100)
          setLoadingMessage('Rendering map...')
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
          const { updatedPops } = demographicsSystem.processMonthTick(regions, currentState.pops)
          gameState.setPops(updatedPops)

          // Process governance phase transitions
          const updatedEntities = governanceSystem.processMonthTick(
            currentState.colonial_entities,
            currentState.regions,
            currentState.pops,
            currentState.current_year
          )
          gameState.setColonialEntities(updatedEntities)

          // Process state owner monthly stats
          const updatedOwners = stateOwnerSystem.processMonthTick(
            currentState.state_owners,
            updatedEntities
          )
          gameState.setStateOwners(updatedOwners)

          // Process monthly trade (supply/demand flows, prices, income)
          const { clusters: updatedClusters, flows: updatedFlows, routes: updatedRoutes } =
            tradeSystem.processMonthlyTrade(gameState.getState())
          gameState.setTradeClusters(updatedClusters)
          gameState.setTradeFlows(updatedFlows)
          gameState.setTradeRoutes(updatedRoutes)

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

                  // Clear any heir designations pointing to this dead character
                  allCharacters.forEach(other => {
                    if (other.heir_id === char.id) {
                      other.heir_id = undefined
                    }
                  })

                  // Check if this is the player character
                  const playerChar = gameState.getPlayerCharacter()
                  if (playerChar && playerChar.id === char.id) {
                    // Show succession UI
                    const successionLaw = char.succession_law ?? 'primogeniture'
                    const heir = successionSystem.determineSurvivor(char, allCharacters, successionLaw)
                    const alternatives = successionSystem.getPlayableAlternatives(char, allCharacters)
                    const gavelkindCoHeirs = successionLaw === 'gavelkind'
                      ? successionSystem.getGavelkindHeirs(char, allCharacters)
                      : undefined

                    setDeathData({
                      deadCharacter: char,
                      heir,
                      alternatives: alternatives.filter(alt => alt.id !== char.id),
                      gavelkindCoHeirs
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

  const handleMapReady = () => {
    setIsMapRendered(true)
    setShowCharacterSelect(true)
    setShowStartMenu(false)
  }

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

  const handleRequestAdoptionPool = () => {
    const playerChar = gameState.getPlayerCharacter()
    if (!playerChar) return
    const classes = ['governor', 'merchant', 'military', 'diplomat', 'scholar'] as const
    const candidates: Character[] = []
    for (let i = 0; i < 4; i++) {
      const randomClass = classes[Math.floor(Math.random() * classes.length)]
      const child = characterGenerator.generateRandomCharacter({
        class: randomClass,
        culture: playerChar.culture,
        region_id: playerChar.region_id,
        age: 5 + Math.floor(Math.random() * 10), // ages 5–14
        randomize: true
      })
      candidates.push(child)
    }
    setAdoptionPool(candidates)
  }

  const handleAdopt = (childId: string) => {
    const child = adoptionPool.find(c => c.id === childId)
    const playerChar = gameState.getPlayerCharacter()
    if (!child || !playerChar || playerChar.wealth < 200) return
    playerChar.wealth -= 200
    child.father_id = playerChar.id
    child.dynasty_id = playerChar.dynasty_id
    gameState.addCharacter(child)
    playerChar.legitimate_children_ids.push(child.id)
    playerChar.children_ids.push(child.id)
    characterManager.addMemberToDynasty(playerChar.dynasty_id, child.id)
    setAdoptionPool([])
    setGameStateData({ ...gameState.getState() })
  }

  const handleDesignateHeir = (heirId: string) => {
    const playerChar = gameState.getPlayerCharacter()
    if (playerChar) {
      playerChar.heir_id = heirId || undefined
      setGameStateData({ ...gameState.getState() })
    }
  }

  const handleLegitimize = (childId: string) => {
    const playerChar = gameState.getPlayerCharacter()
    if (playerChar && playerChar.prestige >= 100) {
      playerChar.prestige -= 100
      const idx = playerChar.illegitimate_children_ids.indexOf(childId)
      if (idx !== -1) {
        playerChar.illegitimate_children_ids.splice(idx, 1)
        playerChar.legitimate_children_ids.push(childId)
      }
      setGameStateData({ ...gameState.getState() })
    }
  }

  const handleSetSuccessionLaw = (law: SuccessionLaw) => {
    const playerChar = gameState.getPlayerCharacter()
    if (playerChar) {
      playerChar.succession_law = law
      setGameStateData({ ...gameState.getState() })
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
    // Pre-populate loading state before the screen appears so the first paint
    // of the LoadingScreen already shows progress + message (no empty flash).
    setLoadingProgress(0)
    setLoadingMessage('Preparing the New World...')
    setIsMapInitialized(false)
    setIsMapRendered(false)
    // Do NOT hide StartMenu here — the LoadingScreen (z-[110]) will appear over
    // it instantly, providing immediate feedback without any gap between screens.
    // StartMenu is unmounted in handleMapReady once the map is fully rendered.
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
      {/* Loading screen — visible from the moment "New Game" is clicked until the
          map canvas has drawn its first frame.  gameInitialized ensures it only
          appears after the user starts a game; !isMapRendered keeps it visible
          until GameBoard signals the canvas is fully painted. */}
      {gameInitialized && !isMapRendered && (
        <LoadingScreen progress={loadingProgress} message={loadingMessage} />
      )}

      {errorData && (
        <ErrorModal
          title={errorData.title}
          message={errorData.message}
          onClose={() => setErrorData(null)}
        />
      )}

      {/* CharacterSelect appears once the map canvas has painted its first frame
          (showCharacterSelect is set true by handleMapReady at the same time as
          isMapRendered, so the loading screen and this mount atomically). */}
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
          gavelkindCoHeirs={deathData.gavelkindCoHeirs}
          onSelectHeir={handleHeirSelected}
          onSelectAlternative={handleAlternativeSelected}
          onLoadSave={handleLoadSave}
          onGameOver={handleGameOver}
        />
      )}

      {/* Game UI — mounts as soon as the game starts. The LoadingScreen (z-[110])
          sits above all of this during loading, so the user never sees it until
          the map canvas signals it is ready via onReady. */}
      {gameInitialized && (
        <>
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
                  onDesignateHeir={handleDesignateHeir}
                  onLegitimize={handleLegitimize}
                  onSetSuccessionLaw={handleSetSuccessionLaw}
                  adoptionPool={adoptionPool}
                  onRequestAdoptionPool={handleRequestAdoptionPool}
                  onAdopt={handleAdopt}
                />
              </div>
            )}

            {/* Center: Game Canvas — mounts after data load completes so onReady fires once map is baked */}
            {isMapInitialized && !isInitializing && (
              <GameBoard
                selectedRegionId={selectedRegionId}
                onRegionSelect={handleRegionSelect}
                mapMode={mapMode}
                colonialEntities={gameStateData.colonial_entities}
                stateOwners={gameStateData.state_owners}
                tradeRoutes={gameStateData.trade_routes}
                onReady={handleMapReady}
              />
            )}
          </div>

          {/* Map Mode Selector — floating bar at bottom of screen */}
          {isMapInitialized && !isInitializing && (
            <MapModeSelector mapMode={mapMode} onMapModeChange={setMapMode} colonialEntities={gameStateData.colonial_entities} stateOwners={gameStateData.state_owners} />
          )}
        </>
      )}

      {/* StartMenu overlay — z-[70]. Remains mounted while the LoadingScreen
          (z-[110]) is visible so there is zero gap between screens — the loading
          screen fades in over the start menu and both unmount together in
          handleMapReady once the canvas has drawn its first frame. */}
      {showStartMenu && (
        <StartMenu
          onNewGame={handleStartMenuNewGame}
          onLoadGame={handleStartMenuLoadGame}
          onSettings={handleStartMenuSettings}
          onCredits={handleStartMenuCredits}
        />
      )}

      {/* Game Over overlay */}
      {gameOver && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[70]">
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
      )}
    </div>
  )
}

export default App
