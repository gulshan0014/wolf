import { supabase } from '@/lib/supabase'

export async function generateUniqueRoomCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let attempts = 0
  const maxAttempts = 10
  while (attempts < maxAttempts) {
    let code = ''
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    const { data: existingRoom, error } = await supabase.from('rooms').select('code').eq('code', code).maybeSingle()
    if (error) throw error
    if (!existingRoom) return code
    attempts++
  }
  throw new Error('Unable to generate unique room code')
}
