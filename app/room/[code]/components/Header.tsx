'use client'

import React from 'react'
import { Play, Trophy } from 'lucide-react'
import type { Room, Player } from '@/lib/supabase'

interface HeaderProps {
  room?: Room | null
  roomCode: string
  gameStatus: string
  currentRound: number
  activePlayersCount: number
  maxPlayers?: number | null
  isHost: boolean
  groupA?: number
  groupB?: number
}

export default function Header({ room, roomCode, gameStatus, currentRound, activePlayersCount, maxPlayers, isHost, groupA = 0, groupB = 0 }: HeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{room?.room_name || 'Wolf Game Room'}</h1>
          <p className="text-gray-600">Room Code: {roomCode}</p>
          <p className="text-gray-600">
            {gameStatus === 'waiting' && 'Waiting for players...'}
            {gameStatus === 'playing' && 'Game started - Ready for voting!'}
            {gameStatus === 'voting' && `Round ${currentRound}`}
            {gameStatus === 'finished' && 'Game Finished!'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Players: {activePlayersCount}/{maxPlayers ?? '—'}</div>
          {isHost && (
            <div className="text-sm text-gray-600">Group A: {groupA} | Group B: {groupB}</div>
          )}
        </div>
      </div>
    </div>
  )
}
