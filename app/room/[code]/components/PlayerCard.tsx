'use client'

import React from 'react'
import { Users, Crown, XCircle } from 'lucide-react'
import type { Player } from '@/lib/supabase'

interface PlayerCardProps {
  player: Player
  currentPlayer: Player | null
  gameStatus: string
  voteCount: number
  hasVoted: boolean
  canVoteFor: boolean
  onVote: (playerId: string) => void
  showGroup?: boolean
}

export default function PlayerCard({
  player,
  currentPlayer,
  gameStatus,
  voteCount,
  hasVoted,
  canVoteFor,
  onVote,
  showGroup = false
}: PlayerCardProps) {
  const isCurrentPlayer = currentPlayer?.id === player.id
  const isHost = player.is_host

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[PlayerCard] render', { playerId: player.id, isCurrentPlayer, isHost, canVoteFor, hasVoted })
  }

  return (
    <div className={`p-4 rounded-lg border-2 ${
      isCurrentPlayer
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isHost ? (
            <Crown className="h-5 w-5 text-yellow-500" />
          ) : (
            <Users className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <div className="font-medium text-gray-900">
              {player.name}
              {isCurrentPlayer && ' (You)'}
            </div>
            {showGroup && player.player_group && (
              <div className="text-sm text-gray-600">Group: {player.player_group}</div>
            )}
            {showGroup && !player.player_group && (
              <div className="text-sm text-gray-600">Host (No Group)</div>
            )}
            {gameStatus === 'playing' && (
              <div className="text-sm text-gray-600">Votes: {voteCount}</div>
            )}
          </div>
        </div>

        {gameStatus === 'voting' && !isCurrentPlayer && canVoteFor && (
          <button
            onClick={() => onVote(player.id)}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            disabled={gameStatus !== 'voting'}
          >
            {hasVoted ? 'Change Vote' : 'Vote'}
          </button>
        )}

        {gameStatus === 'voting' && !isCurrentPlayer && hasVoted && (
          <XCircle className="h-5 w-5 text-gray-400" />
        )}
      </div>
    </div>
  )
}
