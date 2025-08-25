'use client'

import React from 'react'
import type { Room, Player, Vote } from '@/lib/supabase'
import Header from './Header'
import HostControls from './HostControls'
import PlayerCard from './PlayerCard'

interface HostViewProps {
  room?: Room | null
  roomCode: string
  gameStatus: string
  currentRound: number
  activePlayers: Player[]
  players: Player[]
  currentPlayer: Player | null
  votes: Vote[]
  startGame: () => void
  revealHighest: () => void
  finalizeElimination: () => void
  getVoteCount: (id: string) => number
  hasVoted: () => boolean
  canVoteFor: (id: string) => boolean
  onVote: (playerId: string) => void
}

export default function HostView({ room, roomCode, gameStatus, currentRound, activePlayers, players, currentPlayer, votes, startGame, revealHighest, finalizeElimination, getVoteCount, hasVoted, canVoteFor, onVote }: HostViewProps) {
  const groupAPlayers = activePlayers.filter(p => p.player_group === 'A')
  const groupBPlayers = activePlayers.filter(p => p.player_group === 'B')

  return (
    <div>
      <Header room={room} roomCode={roomCode} gameStatus={gameStatus} currentRound={currentRound} activePlayersCount={activePlayers.length} maxPlayers={room?.max_players ?? null} isHost={true} groupA={groupAPlayers.length} groupB={groupBPlayers.length} />
      <HostControls isHost={true} gameStatus={gameStatus} activePlayersCount={activePlayers.length} allVotesIn={votes.length >= activePlayers.length} revealedTargetId={null} startGame={startGame} revealHighest={revealHighest} finalizeElimination={finalizeElimination} />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Group A ({groupAPlayers.length})</h3>
          <div className="space-y-3">
            {groupAPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                currentPlayer={currentPlayer}
                gameStatus={gameStatus}
                voteCount={getVoteCount(player.id)}
                hasVoted={hasVoted()}
                canVoteFor={canVoteFor(player.id)}
                onVote={onVote}
                showGroup={true}
              />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Group B ({groupBPlayers.length})</h3>
          <div className="space-y-3">
            {groupBPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                currentPlayer={currentPlayer}
                gameStatus={gameStatus}
                voteCount={getVoteCount(player.id)}
                hasVoted={hasVoted()}
                canVoteFor={canVoteFor(player.id)}
                onVote={onVote}
                showGroup={true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
