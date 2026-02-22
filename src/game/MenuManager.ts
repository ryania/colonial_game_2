/**
 * MenuManager - Centralized menu system using registry pattern
 * Supports dynamic menu switching with context (character ID, region ID, etc.)
 */

export type MenuType = 'character' | 'province' | 'army' | 'trade' | 'diplomacy' | 'governance' | 'none'

export interface MenuState {
  active_menu: MenuType
  context_id?: string // Character ID, Region ID, Army ID, etc.
}

export class MenuManager {
  private active_menu: MenuType = 'none'
  private context_id?: string
  private listeners: Set<(state: MenuState) => void> = new Set()

  /**
   * Open a menu with optional context
   */
  openMenu(menu: MenuType, contextId?: string): void {
    if (menu === 'none') {
      this.closeMenu()
      return
    }

    this.active_menu = menu
    this.context_id = contextId
    this.notifyListeners()
  }

  /**
   * Close the current menu
   */
  closeMenu(): void {
    this.active_menu = 'none'
    this.context_id = undefined
    this.notifyListeners()
  }

  /**
   * Switch to a different menu (closes current, opens new)
   */
  switchMenu(menu: MenuType, contextId?: string): void {
    if (menu === this.active_menu && contextId === this.context_id) {
      // Already on this menu, do nothing
      return
    }
    this.openMenu(menu, contextId)
  }

  /**
   * Get the currently active menu type
   */
  getActiveMenu(): MenuType {
    return this.active_menu
  }

  /**
   * Get the context ID for the active menu
   */
  getContextId(): string | undefined {
    return this.context_id
  }

  /**
   * Check if a menu is currently open
   */
  isMenuOpen(): boolean {
    return this.active_menu !== 'none'
  }

  /**
   * Get full menu state
   */
  getState(): MenuState {
    return {
      active_menu: this.active_menu,
      context_id: this.context_id
    }
  }

  /**
   * Subscribe to menu state changes
   */
  subscribe(listener: (state: MenuState) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  /**
   * Reset menu manager to initial state
   */
  reset(): void {
    this.active_menu = 'none'
    this.context_id = undefined
    this.listeners.clear()
  }
}

// Singleton instance
export const menuManager = new MenuManager()
