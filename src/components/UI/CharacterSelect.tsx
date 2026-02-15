import React, { useState } from 'react'
import { Character, CharacterClass } from '../../game/types'
import { characterGenerator } from '../../game/CharacterGenerator'
import { characterClassManager } from '../../game/CharacterClass'

interface CharacterSelectProps {
  characters: Character[]
  onSelect: (character: Character) => void
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({ characters, onSelect }) => {
  const [selectedTab, setSelectedTab] = useState<'historical' | 'randomize'>('historical')
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('governor')
  const [generatedCharacter, setGeneratedCharacter] = useState<Character | null>(null)

  const historicalCharacters = characters.filter(c => c.is_alive && c.age >= 16)

  const handleGenerateRandom = () => {
    const newChar = characterGenerator.generateRandomCharacter({
      class: selectedClass,
      randomize: true
    })
    setGeneratedCharacter(newChar)
  }

  const handleSelectHistorical = (character: Character) => {
    onSelect(character)
  }

  const handleSelectGenerated = () => {
    if (generatedCharacter) {
      // Add generated character to game
      onSelect(generatedCharacter)
    }
  }

  const classes: CharacterClass[] = ['governor', 'merchant', 'military', 'diplomat', 'scholar']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border-2 border-amber-700 rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-auto">
        <h1 className="text-3xl font-bold text-amber-400 mb-6">SELECT YOUR CHARACTER</h1>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-amber-700">
          <button
            onClick={() => setSelectedTab('historical')}
            className={`px-4 py-2 font-bold transition-colors ${
              selectedTab === 'historical'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-300 hover:text-amber-300'
            }`}
          >
            Historical Characters
          </button>
          <button
            onClick={() => setSelectedTab('randomize')}
            className={`px-4 py-2 font-bold transition-colors ${
              selectedTab === 'randomize'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-300 hover:text-amber-300'
            }`}
          >
            Randomized Character
          </button>
        </div>

        {/* Historical Characters Tab */}
        {selectedTab === 'historical' && (
          <>
            {historicalCharacters.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historicalCharacters.map(character => (
                  <div
                    key={character.id}
                    className="bg-slate-800 border border-amber-600 rounded p-4 hover:bg-slate-700 cursor-pointer transition-colors"
                    onClick={() => handleSelectHistorical(character)}
                  >
                    <h3 className="text-lg font-bold text-amber-400">{character.name}</h3>
                    <p className="text-sm text-slate-400">Age: {character.age}</p>
                    <p className="text-sm text-slate-400">Region: {character.region_id}</p>
                    <p className="text-sm text-slate-400">Culture: {character.culture}</p>
                    <p className="text-sm text-slate-400">
                      Class: <span className="text-amber-300">{character.character_class}</span>
                    </p>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {character.traits.map(trait => (
                        <span
                          key={trait}
                          className="px-2 py-1 bg-amber-900 text-amber-300 text-xs rounded"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                    <button className="mt-4 w-full bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded font-bold transition-colors">
                      SELECT
                    </button>
                  </div>
                ))}
              </div>
            )}
            {historicalCharacters.length === 0 && (
              <div className="text-center py-8">
                <p className="text-red-400 font-bold">ERROR: No playable characters available</p>
                <p className="text-slate-400 text-sm mt-2">This should never happen. Please restart the game.</p>
              </div>
            )}
          </>
        )}

        {/* Randomized Character Tab */}
        {selectedTab === 'randomize' && (
          <div className="space-y-6">
            {/* Class Selection */}
            <div>
              <h3 className="text-lg font-bold text-amber-400 mb-3">Choose a Class</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {classes.map(charClass => (
                  <button
                    key={charClass}
                    onClick={() => setSelectedClass(charClass)}
                    className={`p-3 rounded border-2 transition-colors font-bold text-sm ${
                      selectedClass === charClass
                        ? 'border-amber-400 bg-amber-900 text-amber-300'
                        : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-amber-600'
                    }`}
                  >
                    {charClass.charAt(0).toUpperCase() + charClass.slice(1)}
                  </button>
                ))}
              </div>
              {selectedClass && (
                <div className="mt-3 p-3 bg-slate-800 border border-slate-700 rounded">
                  <p className="text-slate-300">
                    <span className="text-amber-400 font-bold">{characterClassManager.getDescription(selectedClass)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateRandom}
              className="w-full bg-amber-700 hover:bg-amber-600 text-white px-6 py-3 rounded font-bold transition-colors"
            >
              GENERATE RANDOM CHARACTER
            </button>

            {/* Generated Character Preview */}
            {generatedCharacter && (
              <div className="bg-slate-800 border-2 border-amber-600 rounded p-4">
                <h3 className="text-xl font-bold text-amber-400 mb-3">Generated Character</h3>
                <div className="space-y-2">
                  <p className="text-lg">
                    <span className="font-bold text-amber-400">{generatedCharacter.name}</span>
                  </p>
                  <p className="text-slate-400">Age: {generatedCharacter.age}</p>
                  <p className="text-slate-400">Culture: {generatedCharacter.culture}</p>
                  <p className="text-slate-400">Religion: {generatedCharacter.religion}</p>
                  <p className="text-slate-400">
                    Class: <span className="text-amber-300">{generatedCharacter.character_class}</span>
                  </p>
                  <p className="text-slate-400">Wealth: {generatedCharacter.wealth}</p>
                  <p className="text-slate-400">Prestige: {generatedCharacter.prestige}</p>

                  <div className="mt-3">
                    <p className="text-slate-400 font-bold">Traits:</p>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {generatedCharacter.traits.map(trait => (
                        <span
                          key={trait}
                          className="px-2 py-1 bg-amber-900 text-amber-300 text-xs rounded"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={handleSelectGenerated}
                    className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded font-bold transition-colors"
                  >
                    USE THIS CHARACTER
                  </button>
                  <button
                    onClick={handleGenerateRandom}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-bold transition-colors"
                  >
                    GENERATE NEW
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
