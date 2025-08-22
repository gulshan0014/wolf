import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Room {
  id: string
  code: string
  room_name: string
  max_players: number
  max_group_a: number
  status: 'waiting' | 'playing' | 'voting' | 'finished'
  created_at: string
  host_id: string
}

export interface Player {
  id: string
  room_id: string
  name: string
  player_group: 'A' | 'B' | null
  is_active: boolean
  is_host: boolean
  created_at: string
}

export interface Vote {
  id: string
  room_id: string
  voter_id: string
  target_id: string
  round: number
  created_at: string
}
