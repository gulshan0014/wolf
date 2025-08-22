-- Wolf Voting Game Database Setup
-- Run this script in your Supabase SQL Editor

-- Create rooms table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  room_name TEXT NOT NULL,
  max_players INTEGER NOT NULL,
  max_group_a INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'voting', 'finished')),
  host_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  player_group TEXT CHECK (player_group IN ('A', 'B') OR player_group IS NULL),
  is_active BOOLEAN DEFAULT true,
  is_host BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES players(id) ON DELETE CASCADE,
  target_id UUID REFERENCES players(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for demo)
CREATE POLICY "Allow all operations on rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on votes" ON votes FOR ALL USING (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Create indexes for better performance
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_players_group ON players(player_group);
CREATE INDEX idx_votes_room_round ON votes(room_id, round);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_target_id ON votes(target_id);
