'use client'

import React from 'react'

interface HostControlsProps {
  isHost: boolean
  gameStatus: string
  activePlayersCount: number
  allVotesIn: boolean
  revealedTargetId: string | null
  startGame: () => void
  revealHighest: () => void
  finalizeElimination: () => void
}

export default function HostControls({ isHost, gameStatus, activePlayersCount, allVotesIn, revealedTargetId, startGame, revealHighest, finalizeElimination }: HostControlsProps) {
  if (!isHost) return null
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {gameStatus === 'waiting' && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Host Controls</h3>
            <p className="text-gray-600">{activePlayersCount >= 3 ? 'Ready to start the game!' : 'Need at least 3 players'}</p>
          </div>
          <div className="space-x-2">
            <button disabled={activePlayersCount < 3} onClick={startGame} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">Start Game</button>
          </div>
        </div>
      )}
      {gameStatus === 'voting' && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Voting Controls</h3>
            <p className="text-sm text-gray-600">Votes cast: (see status)</p>
          </div>
          <div className="space-x-2">
            <button disabled={!allVotesIn} onClick={revealHighest} className="px-4 py-2 bg-yellow-500 text-white rounded-md disabled:opacity-50">Reveal Highest</button>
            <button disabled={!revealedTargetId} onClick={finalizeElimination} className="px-4 py-2 bg-red-600 text-white rounded-md disabled:opacity-50">Finalize Elimination</button>
          </div>
        </div>
      )}
    </div>
  )
}
