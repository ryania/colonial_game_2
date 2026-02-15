import React from 'react'
import { Character } from '../../game/types'

interface PlayerCharacterProps {
  character: Character | undefined
  onSwitchClick: () => void
  onViewProfile: () => void
}

export const PlayerCharacter: React.FC<PlayerCharacterProps> = ({
  character,
  onSwitchClick,
  onViewProfile
}) => {
  if (!character) {
    return (
      <div className="bg-slate-800 border border-amber-700 rounded-lg p-4">
        <p className="text-slate-400 text-sm">No character selected</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border-2 border-amber-700 rounded-lg p-4">
      <h2 className="text-sm font-bold text-amber-400 mb-3 uppercase">Your Character</h2>

      {/* Character Header */}
      <div className="mb-4 pb-3 border-b border-amber-700">
        <h3 className="text-lg font-bold text-white">{character.name}</h3>
        <p className="text-xs text-slate-400">
          {character.character_class.charAt(0).toUpperCase() + character.character_class.slice(1)} •{' '}
          {character.culture} • Age {character.age}
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs uppercase">Region</p>
          <p className="text-white font-bold">{character.region_id}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase">Wealth</p>
          <p className="text-amber-300 font-bold">{character.wealth}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase">Prestige</p>
          <p className="text-amber-300 font-bold">{character.prestige}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase">Health</p>
          <p className="text-green-400 font-bold">{character.health}%</p>
        </div>
      </div>

      {/* Traits */}
      {character.traits.length > 0 && (
        <div className="mb-4">
          <p className="text-slate-500 text-xs uppercase mb-2">Traits</p>
          <div className="flex gap-1 flex-wrap">
            {character.traits.map(trait => (
              <span
                key={trait}
                className="px-2 py-1 bg-amber-900 text-amber-300 text-xs rounded"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Family Info */}
      <div className="mb-4 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-slate-500 text-xs uppercase">Children</p>
            <p className="text-white font-bold">
              {character.legitimate_children_ids.length + character.illegitimate_children_ids.length}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase">Relations</p>
            <p className="text-white font-bold">{character.relationship_ids.length}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={onViewProfile}
          className="w-full bg-amber-700 hover:bg-amber-600 text-white px-3 py-2 rounded font-bold text-sm transition-colors"
        >
          VIEW PROFILE
        </button>
        <button
          onClick={onSwitchClick}
          className="w-full bg-slate-700 hover:bg-slate-600 text-amber-300 px-3 py-2 rounded font-bold text-sm transition-colors border border-slate-600 hover:border-amber-600"
        >
          SWITCH CHARACTER
        </button>
      </div>
    </div>
  )
}
