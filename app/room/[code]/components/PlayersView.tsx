'use client'

import React from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'
import Header from './Header'
import PlayerCard from './PlayerCard'
import VotingStatus from './VotingStatus'
import { Users } from 'lucide-react'

interface PlayersViewProps {
  room?: Room | null
  roomCode: string
  gameStatus: string
  currentRound: number
  activePlayers: Player[]
  players: Player[]
  currentPlayer: Player | null
  votes: Vote[]
  getVoteCount: (id: string) => number
  hasVoted: () => boolean
  canVoteFor: (id: string) => boolean
  cancelVote: () => void
  allVotesIn: boolean
  revealedTargetId: string | null
  revealedCount: number | null
  onVote: (playerId: string) => void
}

export default function PlayersView({ room, roomCode, gameStatus, currentRound, activePlayers, players, currentPlayer, votes, getVoteCount, hasVoted, canVoteFor, cancelVote, allVotesIn, revealedTargetId, revealedCount, onVote }: PlayersViewProps) {
  return (
    <div>
      <Header room={room} roomCode={roomCode} gameStatus={gameStatus} currentRound={currentRound} activePlayersCount={activePlayers.length} maxPlayers={room?.max_players ?? null} isHost={false} />
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-gray-600" />
          All Players ({activePlayers.length})
        </h3>
        <div className="space-y-3">
          {activePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              currentPlayer={currentPlayer}
              gameStatus={gameStatus}
              voteCount={getVoteCount(player.id)}
              hasVoted={hasVoted()}
              canVoteFor={canVoteFor(player.id)}
              onVote={onVote}
              showGroup={gameStatus === 'finished'}
            />
          ))}
        </div>
      </div>

      {gameStatus === 'voting' && (
        <VotingStatus
          activePlayers={activePlayers}
          getVoteCount={getVoteCount}
          allVotesIn={allVotesIn}
          hasVoted={hasVoted()}
          cancelVote={cancelVote}
          revealedTargetId={revealedTargetId}
          revealedCount={revealedCount}
          players={players}
        />
      )}
    </div>
  )
}
