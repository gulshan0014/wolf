# Wolf Voting Game

A real-time voting elimination game built with Next.js, Supabase, and Tailwind CSS. Players are divided into two groups and vote to eliminate each other until one group wins.

## Features

- 🎮 **Real-time Gameplay**: No page refreshes needed, all updates happen instantly
- 📱 **Mobile Responsive**: Works perfectly on mobile browsers
- 👥 **Room System**: Create rooms with custom names and player limits
- 🎯 **Group Division**: Players randomly assigned to Group A or B
- 🗳️ **Voting System**: Real-time voting with instant results
- 🏆 **Win Conditions**: Automatic win detection and celebration
- 👑 **Host Controls**: Host can start the game and manage the room

## Game Rules

1. **Room Creation**: Host creates a room with a name and sets total players and Group A limits
2. **Joining**: Players join with room code and username
3. **Group Assignment**: Players randomly divided into Group A and B
4. **Voting Rounds**: Each round, all players vote to eliminate one player
5. **Elimination**: Player with most votes is eliminated
6. **Win Condition**: 
   - If one group has 0 players → other group wins
   - If both groups have equal players → Group A wins

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Icons**: Lucide React
- **Language**: TypeScript

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd wolf-voting-game
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API to get your project URL and anon key

### 4. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create rooms table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  room_name TEXT NOT NULL,
  max_players INTEGER NOT NULL,
  max_group_a INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  host_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  player_group TEXT CHECK (player_group IN ('A', 'B')),
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

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Play

### For Host:
1. Click "Create Room" on the homepage
2. Enter a room name and set total players and Group A player limit
3. Share the room code with other players
4. Wait for players to join
5. Click "Start Game" when ready

### For Players:
1. Click "Join Room" on the homepage
2. Enter the room code and your name
3. Wait for the host to start the game
4. Vote to eliminate players each round
5. Try to be the last group standing!

## Project Structure

```
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage
│   └── room/[code]/         # Room pages
├── lib/
│   └── supabase.ts          # Supabase client and types
├── components/              # Reusable components
├── public/                  # Static assets
└── README.md               # This file
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your own purposes!

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
