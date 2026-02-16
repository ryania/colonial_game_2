import React, { useState, useMemo, memo } from 'react'
import { Character } from '../../game/types'

interface FocusedCharactersProps {
  focusedCharacters: Character[]
  playerCharacterId: string
  allCharacters: Character[]
  onSelectCharacter: (character: Character) => void
  onRemoveFocus: (characterId: string) => void
  onAddFocus: (character: Character) => void
}

const FocusedCharactersComponent: React.FC<FocusedCharactersProps> = ({
  focusedCharacters,
  playerCharacterId,
  allCharacters,
  onSelectCharacter,
  onRemoveFocus,
  onAddFocus
}) => {
  const [showAddModal, setShowAddModal] = useState(false)

  const canAddMore = focusedCharacters.length < 5

  // Optimize: Use Set for O(1) lookup instead of O(n) .some() check
  const availableCharacters = useMemo(() => {
    const focusedIds = new Set(focusedCharacters.map(f => f.id))
    return allCharacters.filter(
      c => c.is_alive && !focusedIds.has(c.id) && c.id !== playerCharacterId
    )
  }, [focusedCharacters, allCharacters, playerCharacterId])

  return (
    <div className="bg-slate-800 border border-amber-700 rounded-lg p-3">
      <h3 className="text-sm font-bold text-amber-400 mb-3 uppercase">Focused Characters</h3>

      {/* Focused Characters List */}
      <div className="space-y-2 mb-3">
        {focusedCharacters.length > 0 ? (
          focusedCharacters.map((char, index) => (
            <div
              key={char.id}
              className="bg-slate-700 border border-slate-600 rounded p-2 hover:border-amber-600 transition-colors cursor-pointer group"
              onClick={() => onSelectCharacter(char)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">
                    {index + 1}. {char.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {char.region_id} • Age {char.age}
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onRemoveFocus(char.id)
                  }}
                  className="ml-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs"
                  title="Remove from focus"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-2">No focused characters</p>
        )}
      </div>

      {/* Add Focus Button */}
      {canAddMore && (
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-amber-600 text-amber-400 text-xs py-1 rounded transition-colors font-bold"
        >
          + ADD FOCUS
        </button>
      )}

      {/* Add Focus Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border-2 border-amber-700 rounded-lg p-4 max-w-md w-full max-h-screen overflow-auto">
            <h2 className="text-lg font-bold text-amber-400 mb-4">ADD FOCUSED CHARACTER</h2>

            {availableCharacters.length > 0 ? (
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {availableCharacters.map(char => (
                  <button
                    key={char.id}
                    onClick={() => {
                      onAddFocus(char)
                      setShowAddModal(false)
                    }}
                    className="w-full text-left bg-slate-800 border border-slate-600 hover:border-amber-600 hover:bg-slate-700 rounded p-3 transition-colors"
                  >
                    <p className="font-bold text-white text-sm">{char.name}</p>
                    <p className="text-xs text-slate-400">
                      {char.region_id} • Age {char.age} • {char.character_class}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm mb-4">No other characters available to focus</p>
            )}

            <button
              onClick={() => setShowAddModal(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded font-bold transition-colors text-sm"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const FocusedCharacters = memo(FocusedCharactersComponent)
