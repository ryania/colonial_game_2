import React from 'react'
import { Character } from '../../game/types'

interface CharacterDeathProps {
  deadCharacter: Character
  heir: Character | null
  alternatives: Character[]
  gavelkindCoHeirs?: Character[]
  onSelectHeir: (character: Character) => void
  onSelectAlternative: (character: Character) => void
  onLoadSave: () => void
  onGameOver: () => void
}

export const CharacterDeath: React.FC<CharacterDeathProps> = ({
  deadCharacter,
  heir,
  alternatives,
  gavelkindCoHeirs,
  onSelectHeir,
  onSelectAlternative,
  onLoadSave,
  onGameOver
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border-4 border-red-700 rounded-lg p-8 max-w-2xl w-full max-h-screen overflow-auto">
        {/* Death Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-red-700">
          <h1 className="text-4xl font-bold text-red-500 mb-2">CHARACTER DIED</h1>
          <p className="text-2xl text-amber-300">{deadCharacter.name}</p>
          <p className="text-slate-400 mt-2">
            Age {deadCharacter.age} • {deadCharacter.culture} • {deadCharacter.character_class}
          </p>
        </div>

        {/* Heir Section */}
        {heir ? (
          <div className="mb-8 bg-slate-800 border-2 border-amber-600 rounded p-4">
            <h2 className="text-xl font-bold text-amber-400 mb-3">
              {deadCharacter.heir_id === heir.id ? 'YOUR DESIGNATED HEIR' : 'YOUR HEIR'}
            </h2>
            <div className="space-y-2 mb-4">
              <p className="text-lg font-bold text-white">{heir.name}</p>
              <p className="text-slate-400">Age: {heir.age}</p>
              <p className="text-slate-400">Culture: {heir.culture}</p>
              <p className="text-slate-400">Prestige: {heir.prestige}</p>
              <div className="flex gap-2 flex-wrap mt-2">
                {heir.traits.slice(0, 3).map(trait => (
                  <span
                    key={trait}
                    className="px-2 py-1 bg-amber-900 text-amber-300 text-xs rounded"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => onSelectHeir(heir)}
              className="w-full bg-amber-700 hover:bg-amber-600 text-white px-6 py-3 rounded font-bold transition-colors text-lg"
            >
              CONTINUE AS HEIR
            </button>
            {gavelkindCoHeirs && gavelkindCoHeirs.length > 1 && (
              <div className="mt-3 p-3 bg-slate-700 rounded text-sm text-slate-300">
                <p className="font-bold text-amber-400 mb-1">Gavelkind: Shared Inheritance</p>
                <p className="text-slate-400 mb-2">All children share the title equally:</p>
                {gavelkindCoHeirs.map(child => (
                  <p key={child.id} className="text-slate-300">
                    • {child.name} (age {child.age})
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-8 bg-slate-800 border-2 border-red-600 rounded p-4">
            <p className="text-lg font-bold text-red-400">No direct heir found</p>
          </div>
        )}

        {/* Alternative Characters Section */}
        {alternatives.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-300 mb-3">OTHER OPTIONS</h2>
            <div className="space-y-3">
              {alternatives.map(alt => (
                <div
                  key={alt.id}
                  className="bg-slate-800 border border-slate-600 rounded p-3 hover:border-amber-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-white">{alt.name}</p>
                      <p className="text-sm text-slate-400">
                        Age {alt.age} • {alt.culture} • {alt.character_class}
                      </p>
                      <p className="text-sm text-amber-400 mt-1">
                        Relationship: {getRelationship(deadCharacter, alt)}
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectAlternative(alt)}
                      className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded font-bold transition-colors ml-3"
                    >
                      SELECT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="mt-8 pt-4 border-t border-slate-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onLoadSave}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-bold transition-colors"
            >
              LOAD PREVIOUS SAVE
            </button>
            <button
              onClick={onGameOver}
              className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded font-bold transition-colors"
            >
              GAME OVER
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Helper to determine relationship description
 */
function getRelationship(from: Character, to: Character): string {
  if (from.legitimate_children_ids.includes(to.id)) {
    return 'Your child'
  }
  if (from.father_id === to.id || from.mother_id === to.id) {
    return 'Your parent'
  }
  if (from.sibling_ids.includes(to.id)) {
    return 'Your sibling'
  }
  if (from.spouse_id === to.id) {
    return 'Your spouse'
  }
  if (from.dynasty_id === to.dynasty_id) {
    return 'Family member'
  }
  return 'Ally'
}
