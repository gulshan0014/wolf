import { supabase } from '@/lib/supabase'
import { useInitRoomHelpers } from './initRoom'

const { generateUniqueRoomCode: _generateUniqueRoomCode } = useInitRoomHelpers() // NOTE: top-level invocation OK in this module scope for helper use

export async function createRoomAndHost({ roomCode, roomName, maxPlayers = 8, maxGroupA = 4 }: { roomCode?: string | null, roomName?: string | null, maxPlayers?: number, maxGroupA?: number }) {
  let actualRoomCode = roomCode || null
  let roomData = null

  try {
    if (actualRoomCode) {
      // Try to insert with provided code
      const { data: newRoom, error: insertErr } = await supabase
        .from('rooms')
        .insert({
          code: actualRoomCode,
          room_name: roomName || 'Wolf Game Room',
          max_players: maxPlayers,
          max_group_a: maxGroupA,
          status: 'waiting',
          host_id: crypto.randomUUID()
        })
        .select()
        .single()

      if (insertErr) {
        // if duplicate code, return existing room
        const isDuplicate = (err: any) => {
          if (!err) return false
          if (typeof err === 'object') {
            if ('code' in err && err.code === '23505') return true
            if ('message' in err && typeof err.message === 'string' && err.message.includes('duplicate key value')) return true
          }
          return false
        }
        if (isDuplicate(insertErr)) {
          const { data: existingRoom, error: existingRoomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('code', actualRoomCode)
            .maybeSingle()
          if (existingRoomError) throw existingRoomError
          roomData = existingRoom
        } else {
          throw insertErr
        }
      } else {
        roomData = newRoom
      }
    } else {
      // generate unique code
      actualRoomCode = await _generateUniqueRoomCode()
      const { data: newRoom, error } = await supabase
        .from('rooms')
        .insert({
          code: actualRoomCode,
          room_name: roomName || 'Wolf Game Room',
          max_players: maxPlayers,
          max_group_a: maxGroupA,
          status: 'waiting',
          host_id: crypto.randomUUID()
        })
        .select()
        .single()
      if (error) throw error
      roomData = newRoom
    }

    // Ensure host player exists
    const { data: hostPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomData.id)
      .eq('is_host', true)

    let hostPlayer = null
    if ((!hostPlayers || hostPlayers.length === 0)) {
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: roomData.id,
          name: 'Host',
          player_group: null,
          is_active: true,
          is_host: true
        })
        .select()
        .single()
      if (playerError) throw playerError
      hostPlayer = playerData
    } else {
      hostPlayer = hostPlayers[0]
    }

    return { room: roomData, host: hostPlayer, roomCode: actualRoomCode }
  } catch (err) {
    throw err
  }
}

export async function joinRoom({ roomCode, playerName = 'Player' }: { roomCode: string, playerName?: string }) {
  if (!roomCode) throw new Error('roomCode required')
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .maybeSingle()
  if (roomError) throw roomError
  if (!roomData) throw new Error('Room not found')

  const { data: existingPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomData.id)

  const normalizedName = (playerName || 'Player').trim()
  const existingSame = existingPlayers?.find(p => String(p.name).trim() === normalizedName && !p.is_host)
  if (existingSame) {
    return { room: roomData, player: existingSame }
  }

  const activeCount = existingPlayers?.filter(p => p.is_active).length || 0
  if (activeCount >= roomData.max_players) {
    throw new Error('Room is full')
  }
  const groupACount = existingPlayers?.filter(p => p.player_group === 'A' && p.is_active && !p.is_host).length || 0
  let assignedGroup: 'A' | 'B' = 'B'
  if (groupACount < roomData.max_group_a) {
    assignedGroup = Math.random() < 0.5 ? 'A' : 'B'
  }

  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: roomData.id,
      name: playerName || 'Player',
      player_group: assignedGroup,
      is_active: true,
      is_host: false
    })
    .select()
    .single()
  if (playerError) throw playerError
  return { room: roomData, player: playerData }
}
