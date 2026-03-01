import React, { useState, useEffect } from 'react'
import { Character, GameState, SuccessionLaw } from '../../game/types'
import { menuManager } from '../../game/MenuManager'
import { gameState as gameStateManager } from '../../game/GameState'
import { CharacterMenu } from './Menus/CharacterMenu'
import { ProvinceMenu } from './Menus/ProvinceMenu'
import { StateOwnerMenu } from './Menus/StateOwnerMenu'
import { TradeMenu } from './Menus/TradeMenu'
import { ColonialEntityPanel } from './ColonialEntityPanel'
import './MenuContainer.css'

/**
 * MenuContainer is always mounted so React never pays the cost of tearing down
 * and rebuilding the panel tree when the player opens or switches menus.
 *
 * It subscribes to two independent streams:
 *   - menuManager  → which panel to show (and its context id)
 *   - gameState    → live data to display inside the panel (subscribed only
 *                    while the menu is open, to avoid unnecessary renders)
 *
 * When the menu is closed (active_menu === 'none') the component returns null
 * so the wrapper collapses, but all hooks remain registered.
 */

interface MenuContainerProps {
  onClose?: () => void
  onCharacterSelect?: (character: Character) => void
  onDesignateHeir?: (heirId: string) => void
  onLegitimize?: (childId: string) => void
  onSetSuccessionLaw?: (law: SuccessionLaw) => void
  adoptionPool?: Character[]
  onRequestAdoptionPool?: () => void
  onAdopt?: (childId: string) => void
}

export const MenuContainer: React.FC<MenuContainerProps> = ({
  onClose,
  onCharacterSelect,
  onDesignateHeir,
  onLegitimize,
  onSetSuccessionLaw,
  adoptionPool,
  onRequestAdoptionPool,
  onAdopt
}) => {
  const [menuState, setMenuState] = useState(menuManager.getState())
  const [liveGameState, setLiveGameState] = useState<GameState>(gameStateManager.getState())

  // Subscribe to menu changes — always active so the panel is ready instantly.
  useEffect(() => {
    return menuManager.subscribe((state) => {
      // Snap to the latest game data whenever the panel switches so freshness
      // is guaranteed even if the gameState subscription wasn't active.
      if (state.active_menu !== 'none') {
        setLiveGameState(gameStateManager.getState())
      }
      setMenuState(state)
    })
  }, [])

  // Subscribe to game state updates only while a panel is visible.
  // This decouples the backend tick cycle from the view layer: monthly
  // processing does not trigger menu re-renders when the panel is closed.
  useEffect(() => {
    if (menuState.active_menu === 'none') return
    return gameStateManager.subscribe((state) => setLiveGameState(state))
  }, [menuState.active_menu])

  // Nothing to render — stay mounted so subscriptions and hooks are preserved.
  if (menuState.active_menu === 'none') return null

  const handleClose = () => {
    menuManager.closeMenu()
    onClose?.()
  }

  const renderPanel = () => {
    const { active_menu: activeMenu, context_id: contextId } = menuState

    switch (activeMenu) {
      case 'character': {
        const character = contextId
          ? liveGameState.characters.find(c => c.id === contextId)
          : liveGameState.characters.find(c => c.id === liveGameState.player_character_id)
        if (!character) return <div className="menu-error">Character not found</div>
        return (
          <CharacterMenu
            character={character}
            allCharacters={liveGameState.characters}
            gameState={liveGameState}
            onSelectCharacter={onCharacterSelect}
            onDesignateHeir={onDesignateHeir}
            onLegitimize={onLegitimize}
            onSetSuccessionLaw={onSetSuccessionLaw}
            adoptionPool={adoptionPool}
            onRequestAdoptionPool={onRequestAdoptionPool}
            onAdopt={onAdopt}
            onClose={handleClose}
          />
        )
      }

      case 'province': {
        const region = contextId ? liveGameState.regions.find(r => r.id === contextId) : null
        if (!region) return <div className="menu-error">Province not found</div>
        return (
          <ProvinceMenu
            region={region}
            gameState={liveGameState}
            onSelectRegion={() => {}}
            onClose={handleClose}
          />
        )
      }

      case 'army':
        return <div className="menu-placeholder">Army menu coming soon...</div>

      case 'trade':
        return <TradeMenu gameState={liveGameState} onClose={handleClose} />

      case 'diplomacy':
        return <div className="menu-placeholder">Diplomacy menu coming soon...</div>

      case 'governance': {
        const entity = contextId
          ? (liveGameState.colonial_entities || []).find(e => e.id === contextId)
          : undefined
        if (!entity) return <div className="menu-error">Colonial entity not found</div>
        const stateOwner = entity.state_owner_id
          ? (liveGameState.state_owners || []).find(o => o.id === entity.state_owner_id)
          : undefined
        return (
          <ColonialEntityPanel
            entity={entity}
            regions={liveGameState.regions}
            stateOwner={stateOwner}
            onClose={handleClose}
            onRegionClick={(regionId) => menuManager.openMenu('province', regionId)}
            onStateOwnerClick={(ownerId) => menuManager.openMenu('state_owner', ownerId)}
          />
        )
      }

      case 'state_owner': {
        const owner = contextId
          ? (liveGameState.state_owners || []).find(o => o.id === contextId)
          : undefined
        if (!owner) return <div className="menu-error">State not found</div>
        return (
          <StateOwnerMenu
            owner={owner}
            gameState={liveGameState}
            onClose={handleClose}
          />
        )
      }

      default:
        return <div className="menu-error">Unknown menu type</div>
    }
  }

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h2 className="menu-title">
          {menuState.active_menu.charAt(0).toUpperCase() + menuState.active_menu.slice(1).replace('_', ' ')}
        </h2>
        <button className="menu-close-btn" onClick={handleClose} title="Close menu">
          ✕
        </button>
      </div>

      <div className="menu-content">{renderPanel()}</div>
    </div>
  )
}
