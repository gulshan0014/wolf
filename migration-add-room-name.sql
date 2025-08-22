-- Migration: Add room_name column to existing rooms table
-- Run this script in your Supabase SQL Editor

-- Add room_name column to existing rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_name TEXT DEFAULT 'Wolf Game Room';

-- Update existing rooms to have a default name if they don't have one
UPDATE rooms SET room_name = 'Wolf Game Room' WHERE room_name IS NULL;

-- Make room_name NOT NULL after setting default values
ALTER TABLE rooms ALTER COLUMN room_name SET NOT NULL;

-- Update status constraint to include new 'voting' status
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check CHECK (status IN ('waiting', 'playing', 'voting', 'finished'));

-- Update player_group constraint to allow null for host
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_player_group_check;
ALTER TABLE players ADD CONSTRAINT players_player_group_check CHECK (player_group IN ('A', 'B') OR player_group IS NULL);
