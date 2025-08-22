'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [lastCreatedCode, setLastCreatedCode] = useState('')

  const fetchAllRooms = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      console.log('Fetching all rooms...')
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching rooms:', error)
        setMessage(`Error: ${error.message}`)
        return
      }

      console.log('Rooms fetched successfully:', data)
      setRooms(data || [])
      setMessage(`Found ${data?.length || 0} rooms`)
    } catch (error) {
      console.error('Exception fetching rooms:', error)
      setMessage(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const createTestRoom = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const testCode = 'TEST' + Math.random().toString(36).substring(2, 4).toUpperCase()
      console.log('Creating test room with code:', testCode)
      
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          code: testCode,
          room_name: 'Test Room',
          max_players: 8,
          max_group_a: 4,
          status: 'waiting',
          host_id: crypto.randomUUID()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating test room:', error)
        setMessage(`Error creating room: ${error.message}`)
        return
      }

      console.log('Test room created successfully:', data)
      setLastCreatedCode(testCode)
      setMessage(`Test room created with code: ${testCode}`)
      fetchAllRooms() // Refresh the list
    } catch (error) {
      console.error('Exception creating test room:', error)
      setMessage(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testRoomLookup = async (code: string) => {
    console.log('Testing room lookup for code:', code)
    
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code)
        .maybeSingle()

      if (error) {
        console.error('Error looking up room:', error)
        setMessage(`Lookup error: ${error.message}`)
        return
      }

      if (data) {
        console.log('Room found:', data)
        setMessage(`Room found: ${data.room_name} (${data.code})`)
      } else {
        console.log('No room found with code:', code)
        setMessage(`No room found with code: ${code}`)
      }
    } catch (error) {
      console.error('Exception during lookup:', error)
      setMessage(`Lookup exception: ${error}`)
    }
  }

  const testDatabaseConnection = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      console.log('Testing database connection...')
      
      // Test if rooms table exists
      const { data: roomsTest, error: roomsError } = await supabase
        .from('rooms')
        .select('count')
        .limit(1)
      
      if (roomsError) {
        console.error('Rooms table error:', roomsError)
        setMessage(`Rooms table error: ${roomsError.message}`)
        return
      }
      
      // Test if players table exists
      const { data: playersTest, error: playersError } = await supabase
        .from('players')
        .select('count')
        .limit(1)
      
      if (playersError) {
        console.error('Players table error:', playersError)
        setMessage(`Players table error: ${playersError.message}`)
        return
      }
      
      // Test if votes table exists
      const { data: votesTest, error: votesError } = await supabase
        .from('votes')
        .select('count')
        .limit(1)
      
      if (votesError) {
        console.error('Votes table error:', votesError)
        setMessage(`Votes table error: ${votesError.message}`)
        return
      }
      
      setMessage('Database connection successful! All tables exist.')
      console.log('Database connection test passed')
    } catch (error) {
      console.error('Database connection test failed:', error)
      setMessage(`Database test failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteAllRooms = async () => {
    if (!confirm('Are you sure you want to delete all rooms?')) return
    
    setLoading(true)
    setMessage('')
    
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rooms

      if (error) {
        setMessage(`Error deleting rooms: ${error.message}`)
        return
      }

      setMessage('All rooms deleted')
      setRooms([])
    } catch (error) {
      setMessage(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Database Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          
          <div className="space-y-4">
            <button
              onClick={testDatabaseConnection}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Database'}
            </button>
            
            <button
              onClick={fetchAllRooms}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 ml-2"
            >
              {loading ? 'Loading...' : 'Fetch All Rooms'}
            </button>
            
            <button
              onClick={createTestRoom}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 ml-2"
            >
              {loading ? 'Creating...' : 'Create Test Room'}
            </button>
            
            {lastCreatedCode && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Test Room Created!</h3>
                <p className="text-green-700 mb-2">Room Code: <strong>{lastCreatedCode}</strong></p>
                <div className="space-x-2">
                  <button
                    onClick={() => testRoomLookup(lastCreatedCode)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Test Lookup
                  </button>
                  <a
                    href={`/room/${lastCreatedCode}?playerName=TestPlayer`}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 inline-block"
                  >
                    Join Room
                  </a>
                </div>
              </div>
            )}
            
            <button
              onClick={deleteAllRooms}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 ml-2"
            >
              {loading ? 'Deleting...' : 'Delete All Rooms'}
            </button>
          </div>
          
          {message && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">All Rooms ({rooms.length})</h2>
          
          {rooms.length === 0 ? (
            <p className="text-gray-500">No rooms found</p>
          ) : (
            <div className="space-y-4">
              {rooms.map((room) => (
                <div key={room.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Code:</strong> {room.code}
                    </div>
                    <div>
                      <strong>Name:</strong> {room.room_name}
                    </div>
                    <div>
                      <strong>Status:</strong> {room.status}
                    </div>
                    <div>
                      <strong>Created:</strong> {new Date(room.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => testRoomLookup(room.code)}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                    >
                      Test Lookup
                    </button>
                    <a
                      href={`/room/${room.code}?playerName=TestPlayer`}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 ml-2 inline-block"
                    >
                      Join
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
