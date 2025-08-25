'use client'

import React, { useState } from 'react'
import { joinRoom } from './roomActions'
import type { Player } from '@/lib/supabase'

interface JoinRoomProps {
  onJoined: (roomCode: string, player?: Player) => void
}

export default function JoinRoom({ onJoined }: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('Player')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    setLoading(true)
    setError(null)
    try {
      const { room, player } = await joinRoom({ roomCode: roomCode.trim(), playerName })
      onJoined(room.code, player)
    } catch (err: any) {
      console.error('join failed', err)
      setError(err?.message || 'Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Join Room</h3>
      <div className="space-y-3">
        <input placeholder="Room Code" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} className="w-full p-2 border rounded" />
        <input placeholder="Your Name" value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full p-2 border rounded" />
        {error && <div className="text-red-600">{error}</div>}
        <div>
          <button onClick={handleJoin} disabled={loading || !roomCode.trim()} className="px-4 py-2 bg-green-600 text-white rounded">{loading ? 'Joining...' : 'Join Room'}</button>
        </div>
      </div>
    </div>
  )
}
