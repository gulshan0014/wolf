# Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Supabase (Free)
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings → API** and copy your:
   - Project URL
   - Anon (public) key

### 3. Configure Environment
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 4. Set up Database
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Copy and paste the contents of `database-setup.sql`
4. Click **Run** to create all tables

### 5. Start the App
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start playing! 🎮

## 🎯 How to Test

1. **Create a Room**: Click "Create Room" and set player limits
2. **Join as Player**: Open another browser tab/window and join with the room code
3. **Start Game**: Host clicks "Start Game" when ready
4. **Vote**: Each player votes to eliminate someone
5. **Watch Real-time**: See votes and eliminations happen instantly!

## 📱 Mobile Testing

The app works perfectly on mobile! Just open the same URL on your phone's browser.

## 🚨 Troubleshooting

**"Failed to join room" error?**
- Make sure your Supabase environment variables are correct
- Check that you ran the database setup SQL script

**Real-time not working?**
- Ensure you enabled realtime in the database setup
- Check your internet connection

**Need help?** Check the full [README.md](README.md) for detailed instructions.
