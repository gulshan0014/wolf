'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Home, Users, Gamepad2, Crown } from 'lucide-react'

export default function HomePage() {
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showJoinRoom, setShowJoinRoom] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Wolf Game</h1>
          <p className="text-gray-600">Real-time voting elimination game</p>
        </div>

        {/* Main Actions */}
        <div className="space-y-4">
          <button
            onClick={() => setShowCreateRoom(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Home className="h-5 w-5" />
            <span>Create Room</span>
          </button>

          <button
            onClick={() => setShowJoinRoom(true)}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Users className="h-5 w-5" />
            <span>Join Room</span>
          </button>
        </div>

        {/* How to Play */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Gamepad2 className="h-5 w-5 mr-2" />
            How to Play
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Host creates room and sets player limits</li>
            <li>• Players join with room code and username</li>
            <li>• Players are randomly divided into Group A & B</li>
            <li>• Each round, vote to eliminate one player</li>
            <li>• Last group standing wins!</li>
          </ul>
        </div>

        {/* Create Room Modal */}
        {showCreateRoom && (
          <CreateRoomModal onClose={() => setShowCreateRoom(false)} />
        )}

        {/* Join Room Modal */}
        {showJoinRoom && (
          <JoinRoomModal onClose={() => setShowJoinRoom(false)} />
        )}
      </div>
    </div>
  )
}

function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [maxGroupA, setMaxGroupA] = useState(4)
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()



  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert('Please enter a room name')
      return
    }

    if (maxGroupA >= maxPlayers) {
      alert('Group A players cannot be more than or equal to total players')
      return
    }
    
    setIsCreating(true)
    try {
      // Generate a temporary room code for the URL (will be replaced with unique one)
      const tempCode = Math.random().toString(36).substring(2, 8).toUpperCase().substring(0, 6)
      router.push(`/room/${tempCode}?host=true&roomName=${encodeURIComponent(roomName)}&maxPlayers=${maxPlayers}&maxGroupA=${maxGroupA}`)
    } catch (error) {
      console.error('Error creating room:', error)
      alert('Failed to create room. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create Room</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Players
            </label>
            <input
              type="number"
              min="4"
              max="20"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Players To be WOLF
            </label>
            <input
              type="number"
              min="1"
              max={maxPlayers - 1}
              value={maxGroupA}
              onChange={(e) => setMaxGroupA(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function JoinRoomModal({ onClose }: { onClose: () => void }) {
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const router = useRouter()

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !playerName.trim()) {
      alert('Please enter both room code and player name')
      return
    }

    if (roomCode.length !== 6) {
      alert('Room code must be exactly 6 characters')
      return
    }

    setIsJoining(true)
    try {
      router.push(`/room/${roomCode.toUpperCase()}?playerName=${encodeURIComponent(playerName)}`)
    } catch (error) {
      console.error('Error joining room:', error)
      alert('Failed to join room')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Join Room</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleJoinRoom}
            disabled={isJoining}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  )
}
