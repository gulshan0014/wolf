'use client'

import React from 'react'
import { CheckCircle } from 'lucide-react'
import type { Player } from '@/lib/supabase'

interface VotingStatusProps {
  activePlayers: Player[]
  getVoteCount: (id: string) => number
  allVotesIn: boolean
  hasVoted: boolean
  cancelVote: () => void
  revealedTargetId: string | null
  revealedCount: number | null
  players: Player[]
}

export default function VotingStatus({ activePlayers, getVoteCount, allVotesIn, hasVoted, cancelVote, revealedTargetId, revealedCount, players }: VotingStatusProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Voting Status</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {activePlayers.map(player => (
          <div key={player.id} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-900">{player.name}</div>
            <div className="text-sm text-gray-600">Votes: {getVoteCount(player.id)}</div>
          </div>
        ))}
      </div>
      {!allVotesIn ? (
        <div className="mt-4 text-center text-gray-600">Waiting for other players to vote...</div>
      ) : (
        <div className="mt-4 text-center">
          <CheckCircle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-yellow-600 font-medium">All votes are in — host can reveal the result.</p>
        </div>
      )}
      {hasVoted && (
        <div className="mt-4 text-center">
          <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="text-green-600 font-medium">You have voted!</p>
          <div className="mt-2">
            <button onClick={cancelVote} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300">Cancel Vote</button>
          </div>
        </div>
      )}
      {revealedTargetId && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <div className="text-sm text-yellow-800 font-medium">Host revealed the result</div>
          <div className="text-lg font-semibold text-yellow-900 mt-1">{players.find(p => p.id === revealedTargetId)?.name || 'Unknown'}</div>
          <div className="text-sm text-yellow-700">Votes: {revealedCount ?? 0}</div>
        </div>
      )}
    </div>
  )
}
