'use client'

import React, { useState } from 'react'
import { createRoomAndHost } from './roomActions'

interface CreateRoomProps {
  onCreated: (roomCode: string) => void
}

export default function CreateRoom({ onCreated }: CreateRoomProps) {
  const [roomName, setRoomName] = useState('Wolf Game Room')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [maxGroupA, setMaxGroupA] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const { room, roomCode } = await createRoomAndHost({ roomName, maxPlayers, maxGroupA })
      onCreated(roomCode)
    } catch (err: any) {
      console.error('create room failed', err)
      setError(err?.message || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Create Room</h3>
      <div className="space-y-3">
        <input value={roomName} onChange={e => setRoomName(e.target.value)} className="w-full p-2 border rounded" />
        <div className="flex space-x-2">
          <input type="number" value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className="p-2 border rounded w-1/2" />
          <input type="number" value={maxGroupA} onChange={e => setMaxGroupA(Number(e.target.value))} className="p-2 border rounded w-1/2" />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <div>
          <button onClick={handleCreate} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Creating...' : 'Create Room'}</button>
        </div>
      </div>
    </div>
  )
}
