import { useState } from 'react'

interface StartMenuProps {
  onNewGame: () => void
  onLoadGame: () => void
  onSettings: () => void
  onCredits: () => void
}

export const StartMenu = ({ onNewGame, onLoadGame, onSettings, onCredits }: StartMenuProps) => {
  const [showSettings, setShowSettings] = useState(false)
  const [showCredits, setShowCredits] = useState(false)

  if (showSettings) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[70]">
        <div className="bg-slate-900 border-4 border-red-700 rounded-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-amber-600 mb-6">SETTINGS</h1>
          <div className="text-white space-y-4">
            <p className="text-sm">Game Version: 3.3</p>
            <p className="text-sm">Engine: React + Phaser + TypeScript</p>
            <p className="text-sm text-gray-400 mt-4">More settings coming in future updates...</p>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="w-full mt-8 bg-amber-700 hover:bg-amber-600 text-white px-6 py-3 rounded font-bold text-lg transition-colors"
          >
            BACK
          </button>
        </div>
      </div>
    )
  }

  if (showCredits) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[70]">
        <div className="bg-slate-900 border-4 border-red-700 rounded-lg p-8 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
          <h1 className="text-3xl font-bold text-amber-600 mb-6">CREDITS</h1>
          <div className="text-white text-sm space-y-3">
            <div>
              <p className="text-amber-500 font-bold">Development</p>
              <p className="text-gray-300">Ryania Studios</p>
            </div>
            <div>
              <p className="text-amber-500 font-bold">Version 3.3</p>
              <p className="text-gray-300">Start Menu Update</p>
            </div>
            <div>
              <p className="text-amber-500 font-bold">Technology</p>
              <p className="text-gray-300">React, TypeScript, Phaser 3</p>
            </div>
            <div className="pt-4 border-t border-gray-600">
              <p className="text-gray-400 text-xs">
                Colonial Strategy Game 1600-1800
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCredits(false)}
            className="w-full mt-8 bg-amber-700 hover:bg-amber-600 text-white px-6 py-3 rounded font-bold text-lg transition-colors"
          >
            BACK
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[70]" style={{
      background: 'linear-gradient(135deg, #0f3460 0%, #1a3a52 100%)'
    }}>
      {/* Main Menu Container */}
      <div className="text-center">
        {/* Title */}
        <h1 className="text-6xl font-bold text-amber-600 mb-2 drop-shadow-lg">
          COLONIAL STRATEGY GAME
        </h1>
        <p className="text-2xl text-amber-500 mb-8 drop-shadow-lg">
          1600-1800
        </p>

        {/* Version Badge */}
        <p className="text-amber-400 text-sm mb-12 drop-shadow-lg">
          Version 3.3
        </p>

        {/* Menu Buttons */}
        <div className="space-y-4 w-80">
          <button
            onClick={onNewGame}
            className="w-full bg-amber-700 hover:bg-amber-600 active:bg-amber-900 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors shadow-lg border-2 border-amber-800 hover:border-amber-700"
          >
            NEW GAME
          </button>

          <button
            onClick={onLoadGame}
            disabled
            className="w-full bg-gray-600 text-gray-400 px-8 py-4 rounded-lg font-bold text-lg cursor-not-allowed border-2 border-gray-700 opacity-60"
            title="Save/Load system coming in v3.4"
          >
            LOAD GAME (Soon)
          </button>

          <button
            onClick={() => {
              setShowSettings(true)
              onSettings()
            }}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors shadow-lg border-2 border-slate-800 hover:border-slate-700"
          >
            SETTINGS
          </button>

          <button
            onClick={() => {
              setShowCredits(true)
              onCredits()
            }}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors shadow-lg border-2 border-slate-800 hover:border-slate-700"
          >
            CREDITS
          </button>
        </div>

        {/* Footer */}
        <p className="text-gray-400 text-xs mt-12">
          Establish your dynasty and dominate the colonial world
        </p>
      </div>
    </div>
  )
}
