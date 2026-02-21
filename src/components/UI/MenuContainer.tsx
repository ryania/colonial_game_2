import React, { useState, useEffect } from 'react'
import { GameState, Character, SuccessionLaw } from '../../game/types'
import { MenuManager, MenuType } from '../../game/MenuManager'
import { CharacterMenu } from './Menus/CharacterMenu'
import { ProvinceMenu } from './Menus/ProvinceMenu'
import './MenuContainer.css'

interface MenuContainerProps {
  menuManager: MenuManager
  gameState: GameState
  onClose: () => void
  onCharacterSelect?: (character: Character) => void
  onDesignateHeir?: (heirId: string) => void
  onLegitimize?: (childId: string) => void
  onSetSuccessionLaw?: (law: SuccessionLaw) => void
  adoptionPool?: Character[]
  onRequestAdoptionPool?: () => void
  onAdopt?: (childId: string) => void
}

export const MenuContainer: React.FC<MenuContainerProps> = ({
  menuManager,
  gameState,
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

  useEffect(() => {
    const unsubscribe = menuManager.subscribe((state) => {
      setMenuState(state)
    })
    return () => unsubscribe()
  }, [menuManager])

  const renderMenu = () => {
    const activeMenu = menuState.active_menu
    const contextId = menuState.context_id

    switch (activeMenu) {
      case 'character': {
        const character = contextId ? gameState.characters.find(c => c.id === contextId) : gameState.characters.find(c => c.id === gameState.player_character_id)
        if (!character) return <div className="menu-error">Character not found</div>
        return (
          <CharacterMenu
            character={character}
            allCharacters={gameState.characters}
            gameState={gameState}
            onSelectCharacter={onCharacterSelect}
            onDesignateHeir={onDesignateHeir}
            onLegitimize={onLegitimize}
            onSetSuccessionLaw={onSetSuccessionLaw}
            adoptionPool={adoptionPool}
            onRequestAdoptionPool={onRequestAdoptionPool}
            onAdopt={onAdopt}
            onClose={onClose}
          />
        )
      }

      case 'province': {
        const region = contextId ? gameState.regions.find(r => r.id === contextId) : null
        if (!region) return <div className="menu-error">Province not found</div>
        return (
          <ProvinceMenu
            region={region}
            gameState={gameState}
            onSelectRegion={() => {}}
            onClose={onClose}
          />
        )
      }

      case 'army':
        return <div className="menu-placeholder">Army menu coming soon...</div>

      case 'trade':
        return <div className="menu-placeholder">Trade menu coming soon...</div>

      case 'diplomacy':
        return <div className="menu-placeholder">Diplomacy menu coming soon...</div>

      default:
        return <div className="menu-error">Unknown menu type</div>
    }
  }

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h2 className="menu-title">
          {menuState.active_menu.charAt(0).toUpperCase() + menuState.active_menu.slice(1)}
        </h2>
        <button className="menu-close-btn" onClick={onClose} title="Close menu">
          ✕
        </button>
      </div>

      <div className="menu-content">{renderMenu()}</div>
    </div>
  )
}
