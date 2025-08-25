'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase, type Room, type Player, type Vote } from '@/lib/supabase'
import { Users, Play, Crown, Trophy, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import PlayerCard from './components/PlayerCard'
import VotingStatus from './components/VotingStatus'
import Header from './components/Header'
import HostControls from './components/HostControls'
import HostView from './components/HostView'
import PlayersView from './components/PlayersView'
import CreateRoom from './components/CreateRoom'
import JoinRoom from './components/JoinRoom'

export default function RoomPage() {
  // Utility: Generate a unique 6-character room code
  const generateUniqueRoomCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (code.length !== 6) continue;
      const { data: existingRoom, error: existingRoomError } = await supabase
        .from('rooms')
        .select('code')
        .eq('code', code)
        .maybeSingle();
      if (existingRoomError) throw existingRoomError;
      if (!existingRoom) return code;
      attempts++;
    }
    throw new Error('Unable to generate unique room code');
  };
  const params = useParams()
  const searchParams = useSearchParams()
  const roomCode = params.code as string
  const isHost = searchParams.get('host') === 'true'
  const roomName = searchParams.get('roomName')
  const playerName = searchParams.get('playerName')
  const maxPlayers = Number(searchParams.get('maxPlayers')) || 8
  const maxGroupA = Number(searchParams.get('maxGroupA')) || 4

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [currentRound, setCurrentRound] = useState(1)
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'voting' | 'finished'>('waiting')
  const [winner, setWinner] = useState<'A' | 'B' | null>(null)
  const [revealedTargetId, setRevealedTargetId] = useState<string | null>(null)
  const [revealedCount, setRevealedCount] = useState<number | null>(null)
  const [allVotesIn, setAllVotesIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastNotifiedPlayerIdRef = useRef<string | null>(null)
  const joiningRef = useRef(false)

  useEffect(() => {
    initializeRoom()
  }, [roomCode])

  useEffect(() => {
    if (room) {
      setupRealtimeSubscriptions()
      fetchPlayers()
    }
  }, [room])

  // Host notification for new player join (use players state)
  // Fix: Only notify host if a new player joined and not on initial load
  const prevPlayersRef = useRef<string[]>([])
  useEffect(() => {
    if (isHost && players.length > 1) {
      const nonHostPlayers = players.filter(p => !p.is_host)
      if (nonHostPlayers.length < 1) return;
      const prevIds = prevPlayersRef.current
      // Only notify if there is a new player id in the list
      const newPlayerIds = nonHostPlayers.map(p => p.id).filter(id => !prevIds.includes(id))
      if (newPlayerIds.length > 0) {
        const newPlayers = nonHostPlayers.filter(p => newPlayerIds.includes(p.id))
        newPlayers.forEach(newPlayer => {
          alert(`New player joined: ${newPlayer.name} (Group ${newPlayer.player_group})`)
        })
      }
      prevPlayersRef.current = nonHostPlayers.map(p => p.id)
    }
  }, [players, isHost])

  const fetchPlayers = async () => {
  if (!room) return;
  try {
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at');
    if (playersError) throw playersError;
    if (playersData) {
      console.log('[fetchPlayers] fetched', playersData.length, 'players')
      setPlayers(playersData);
      if (gameStatus !== 'waiting') {
        checkWinCondition(playersData);
      }
    }
  } catch (err) {
    console.error('Error fetching players:', err);
    setError('Error fetching players')
  }
};

  // Polling fallback: re-fetch players every 3s while in a room to handle missed realtime events
  useEffect(() => {
    if (!room) return;
    const interval = setInterval(() => {
      fetchPlayers().catch(e => console.error('Polling fetchPlayers failed', e))
    }, 3000);
    return () => clearInterval(interval);
  }, [room])

  // Fix: Only create host player if not already present and only if currentPlayer is not set
  const initializeRoom = async () => {
    try {
      if (isHost) {
        console.log('Creating room as host with params:', { roomCode, roomName, maxPlayers, maxGroupA });
        let actualRoomCode = roomCode || '';
        let roomData = null;
        if (actualRoomCode) {
          let newRoom, newRoomError;
          try {
            const result = await supabase
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
              .single();
            newRoom = result.data;
            newRoomError = result.error;
          } catch (err) {
            newRoomError = err;
          }
          const isDuplicateError = (err: any) => {
            if (!err) return false;
            if (typeof err === 'object') {
              if ('code' in err && err.code === '23505') return true;
              if ('message' in err && typeof err.message === 'string' && err.message.includes('duplicate key value')) return true;
            }
            return false;
          };
          if (isDuplicateError(newRoomError)) {
            const { data: existingRoom, error: existingRoomError } = await supabase
              .from('rooms')
              .select('*')
              .eq('code', actualRoomCode)
              .maybeSingle();
            if (existingRoomError) throw existingRoomError;
            roomData = existingRoom;
            setRoom(roomData);
            // If the persisted room already contains a reveal, show it
            if ((roomData as any).revealed_target_id) {
              setRevealedTargetId((roomData as any).revealed_target_id)
              setRevealedCount((roomData as any).revealed_count ?? null)
            }
            console.log('Room already exists, using existing:', roomData);
          } else if (newRoomError) {
            throw newRoomError;
          } else {
            roomData = newRoom;
            setRoom(roomData);
            console.log('Room created with provided code:', roomData);
          }
        } else {
          try {
            actualRoomCode = await generateUniqueRoomCode();
            console.log('Generated unique room code:', actualRoomCode);
          } catch (error) {
            console.error('Failed to generate room code:', error);
            setError('Failed to generate room code. Please try again.');
            return;
          }
          const { data: newRoom, error: newRoomError } = await supabase
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
            .single();
          if (newRoomError) throw newRoomError;
          roomData = newRoom;
          setRoom(roomData);
          if ((roomData as any).revealed_target_id) {
            setRevealedTargetId((roomData as any).revealed_target_id)
            setRevealedCount((roomData as any).revealed_count ?? null)
          }
          console.log('Room created with generated code:', roomData);
        }
        window.history.replaceState(null, '', `/room/${actualRoomCode}?host=true&roomName=${encodeURIComponent(roomName || 'Wolf Game Room')}&maxPlayers=${maxPlayers}&maxGroupA=${maxGroupA}`);
        const { data: hostPlayers } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomData.id)
          .eq('is_host', true);
        if ((!hostPlayers || hostPlayers.length === 0) && !currentPlayer) {
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
            .single();
          if (playerError) throw playerError;
          setCurrentPlayer(playerData);
        } else if (hostPlayers && hostPlayers.length > 0) {
          setCurrentPlayer(hostPlayers[0]);
        }
        await fetchPlayers();
      } else {
        // Join existing room
        // Prevent multiple concurrent join attempts from creating duplicate player rows
        if (joiningRef.current) {
          console.log('initializeRoom: join already in progress, skipping duplicate attempt')
          return
        }
        joiningRef.current = true
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .maybeSingle();
        if (roomError) {
          setError('Failed to join room');
          return;
        }
        if (!roomData) {
          setError(`Room with code "${roomCode}" not found. Please check the room code or ask the host to create the room first.`);
          return;
        }
        setRoom(roomData);
        const { data: existingPlayers } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomData.id);

        // Prevent duplicate inserts: if a player with same name (non-host) already exists, use it
        const normalizedName = (playerName || 'Player').trim();
        const existingSame = existingPlayers?.find(p => String(p.name).trim() === normalizedName && !p.is_host);
        if (existingSame) {
          // Reuse existing player row instead of inserting a new one
          setCurrentPlayer(existingSame);
          await fetchPlayers();
          joiningRef.current = false
          return;
        }

        // Count only active players when determining if room is full
        const activeCount = existingPlayers?.filter(p => p.is_active).length || 0;
        if (activeCount >= roomData.max_players) {
          joiningRef.current = false
          setError('Room is full');
          return;
        }
        const groupACount = existingPlayers?.filter(p => p.player_group === 'A' && p.is_active && !p.is_host).length || 0;
        const groupBCount = existingPlayers?.filter(p => p.player_group === 'B' && p.is_active && !p.is_host).length || 0;
        let assignedGroup: 'A' | 'B' = 'B';
        if (groupACount < roomData.max_group_a) {
          assignedGroup = Math.random() < 0.5 ? 'A' : 'B';
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
          .single();
        if (playerError) throw playerError;
        setCurrentPlayer(playerData);
        await fetchPlayers();
        joiningRef.current = false
      }
    } catch (error) {
      console.error('Error initializing room:', error);
      setError('Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to room changes
    const roomSubscription = supabase
      .channel('room_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `code=eq.${roomCode}`
      }, (payload) => {
        const newRoom = payload.new as Room
        setRoom(newRoom)
        setGameStatus(newRoom.status)
        // If the DB includes a revealed target, reflect it in local state so all clients see the reveal
        if ((newRoom as any).revealed_target_id) {
          setRevealedTargetId((newRoom as any).revealed_target_id)
          setRevealedCount((newRoom as any).revealed_count ?? null)
        } else {
          setRevealedTargetId(null)
          setRevealedCount(null)
        }
      })
      .subscribe()

    // Subscribe to player changes
    const playerSubscription = supabase
      .channel('player_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${room?.id}`
      }, async (payload) => {
        console.log('Player change detected:', payload)
        // Fetch updated players list
        await fetchPlayers()
      })
      .subscribe()

    // Subscribe to vote changes
    const voteSubscription = supabase
      .channel('vote_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `room_id=eq.${room?.id}`
      }, async (payload) => {
        const { data: updatedVotes } = await supabase
          .from('votes')
          .select('*')
          .eq('room_id', room?.id)
          .eq('round', currentRound)
        
        if (updatedVotes) {
          setVotes(updatedVotes)
          // mark whether all active players (excluding host) have voted for this round
          const activePlayersCount = players.filter(p => p.is_active && !p.is_host).length
          setAllVotesIn(updatedVotes.length >= activePlayersCount)
          // do not auto-eliminate here — host must click Reveal to show results and Finalize to eliminate
        }
      })
      .subscribe()

    return () => {
      roomSubscription.unsubscribe()
      playerSubscription.unsubscribe()
      voteSubscription.unsubscribe()
    }
  }

  // Real-time update: keep players state in sync for host and player screens
  useEffect(() => {
    if (!room) return;
    // Subscribe to player changes for real-time updates
    const subscription = supabase
      .channel('player_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${room.id}`
      }, async () => {
        // Fetch updated players list
        await fetchPlayers();
      })
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [room])

  const startGame = async () => {
    if (!room || !isHost) return

    try {
      // Update room status to voting so players can vote immediately
      const { data, error } = await supabase
        .from('rooms')
        .update({ status: 'voting' })
        .eq('id', room.id)
        .select()
        .single();
      if (error) throw error
      // update local state immediately
      setRoom(data)
      setGameStatus('voting')
      setCurrentRound(1)
      setVotes([])
      setAllVotesIn(false)
      setRevealedTargetId(null)
      setRevealedCount(null)
    } catch (err) {
      console.error('Error starting game:', err)
    }
  }

  const startVoting = async () => {
    if (!room || !isHost) return

    try {
      await supabase
        .from('rooms')
        .update({ status: 'voting' })
        .eq('id', room.id)
    } catch (error) {
      console.error('Error starting voting:', error)
    }
  }

  const castVote = async (targetPlayerId: string) => {
    if (!currentPlayer || !room) return
    // Host cannot vote
    if (currentPlayer.is_host === true) return

    try {
      // Check if the user already has a vote this round
      const { data: existingVote, error: existingErr } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', room.id)
        .eq('voter_id', currentPlayer.id)
        .eq('round', currentRound)
        .maybeSingle();
      if (existingErr) throw existingErr;

      if (existingVote) {
        // Update existing vote to change target
        const { data: updated, error: updateErr } = await supabase
          .from('votes')
          .update({ target_id: targetPlayerId })
          .eq('id', existingVote.id)
          .select()
          .single();
        if (updateErr) throw updateErr;
        setVotes(prev => prev.map(v => v.id === updated.id ? updated : v));
      } else {
        // Insert new vote
        const { data, error } = await supabase
          .from('votes')
          .insert({
            room_id: room.id,
            voter_id: currentPlayer.id,
            target_id: targetPlayerId,
            round: currentRound
          })
          .select()
          .single();
        if (error) throw error;
        setVotes(prev => (data ? [...prev, data] : prev));
      }
    } catch (err) {
      console.error('Error casting/updating vote:', err)
    }
  }

  const cancelVote = async () => {
    if (!currentPlayer || !room) return
    try {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('room_id', room.id)
        .eq('voter_id', currentPlayer.id)
        .eq('round', currentRound)
      if (error) throw error
      // update local state
      setVotes(prev => prev.filter(v => !(v.voter_id === currentPlayer.id && v.round === currentRound)))
      setAllVotesIn(false)
    } catch (err) {
      console.error('Error cancelling vote:', err)
    }
  }

  // Reveal the current highest voted target (host only)
  const revealHighest = async () => {
    if (!room) return
    if (votes.length === 0) return
    const voteCounts: { [key: string]: number } = {}
    votes.forEach(v => {
      voteCounts[v.target_id] = (voteCounts[v.target_id] || 0) + 1
    })
    const maxVotes = Math.max(...Object.values(voteCounts))
    const topTargetId = Object.keys(voteCounts).find(id => voteCounts[id] === maxVotes) || null
    // Persist the reveal to the DB so everyone sees it via realtime
    try {
      const { data: updatedRoom, error } = await supabase
        .from('rooms')
        .update({ revealed_target_id: topTargetId, revealed_count: maxVotes })
        .eq('id', room.id)
        .select()
        .single();
      if (error) {
        // If DB doesn't allow the column or update fails, fall back to local state
        console.warn('Failed to persist reveal to DB, falling back to local state:', error)
        setRevealedTargetId(topTargetId)
        setRevealedCount(maxVotes)
        return
      }
      // Apply persisted reveal
      setRevealedTargetId((updatedRoom as any).revealed_target_id)
      setRevealedCount((updatedRoom as any).revealed_count ?? maxVotes)
    } catch (err) {
      console.error('Error persisting reveal:', err)
      setRevealedTargetId(topTargetId)
      setRevealedCount(maxVotes)
    }
  }

  const finalizeElimination = async () => {
    if (!revealedTargetId || !room) return
    try {
      await supabase
        .from('players')
        .update({ is_active: false })
        .eq('id', revealedTargetId)
      // clear votes for current round
      await supabase
        .from('votes')
        .delete()
        .eq('room_id', room.id)
        .eq('round', currentRound)
      // Clear persisted reveal on the room if supported
      try {
        await supabase
          .from('rooms')
          .update({ revealed_target_id: null, revealed_count: null })
          .eq('id', room.id)
      } catch (clearErr) {
        console.warn('Failed to clear persisted reveal on room:', clearErr)
      }
      // advance round
      setCurrentRound(prev => prev + 1)
      setVotes([])
      setAllVotesIn(false)
      setRevealedTargetId(null)
      setRevealedCount(null)
      // Refresh players
      await fetchPlayers()
    } catch (err) {
      console.error('Error finalizing elimination:', err)
    }
  }

  const processVotingRound = async (currentVotes: Vote[]) => {
    if (!room) return

    // Only mark whether all votes are in. Do not auto-eliminate — host must reveal and finalize.
    // Treat is_host strictly === true to avoid truthy/coercion edge cases from DB
    const activePlayers = players.filter(p => p.is_active && p.is_host !== true)
    if (currentVotes.length < activePlayers.length) {
      setAllVotesIn(false)
      return
    }
    setAllVotesIn(true)
  }

  // Helper: determine if a target player can be voted for by the current player
  const canVoteFor = (playerId: string) => {
    if (!currentPlayer) {
      if (process.env.NODE_ENV !== 'production') console.debug('[canVoteFor] no currentPlayer', { playerId })
      return false
    }
    // Host cannot vote at all
    if (currentPlayer.is_host === true) {
      if (process.env.NODE_ENV !== 'production') console.debug('[canVoteFor] currentPlayer is host - cannot vote', { playerId, currentPlayerId: currentPlayer.id })
      return false
    }
    if (playerId === currentPlayer.id) {
      if (process.env.NODE_ENV !== 'production') console.debug('[canVoteFor] target is self - cannot vote', { playerId })
      return false
    }
    const target = players.find(p => p.id === playerId)
    if (!target) {
      if (process.env.NODE_ENV !== 'production') console.debug('[canVoteFor] target not found', { playerId })
      return false
    }
    // target must be active and not a host
    if (!target.is_active) {
      if (process.env.NODE_ENV !== 'production') console.debug('[canVoteFor] target not active', { playerId })
      return false
    }
    if (target.is_host === true) {
      if (process.env.NODE_ENV !== 'production') console.debug('[canVoteFor] target is host - cannot vote', { playerId })
      return false
    }
    if (process.env.NODE_ENV !== 'production') console.debug('[canVoteFor] allowed', { playerId, currentPlayerId: currentPlayer.id })
    return true
  }

  const hasVoted = () => {
    const result = votes.some(vote => vote.voter_id === currentPlayer?.id && vote.round === currentRound)
    if (process.env.NODE_ENV !== 'production') console.debug('[hasVoted]', { voterId: currentPlayer?.id, round: currentRound, result })
    return result
  }

  const checkWinCondition = (currentPlayers: Player[]) => {
    const activePlayers = currentPlayers.filter(p => p.is_active && !p.is_host) // Exclude host
    const groupA = activePlayers.filter(p => p.player_group === 'A')
    const groupB = activePlayers.filter(p => p.player_group === 'B')

    // Only check win condition if there are actual players in groups
    if (activePlayers.length === 0) return

    if (groupA.length === 0) {
      setWinner('B')
      setGameStatus('finished')
    } else if (groupB.length === 0) {
      setWinner('A')
      setGameStatus('finished')
    } else if (groupA.length === groupB.length) {
      setWinner('A') // Group A wins on tie
      setGameStatus('finished')
    }
  }

  const getVoteCount = (playerId: string) => {
    return votes.filter(vote => vote.target_id === playerId).length
  }

  // Map internal group codes to user-facing labels
  const getGroupLabel = (group?: string | null) => {
    if (!group) return 'No Group'
    return group === 'A' ? 'Wolf' : group === 'B' ? 'Villagers' : String(group)
  }
  
  const getWinnerLabel = (w?: 'A' | 'B' | null) => {
    if (!w) return ''
    return w === 'A' ? 'Wolf' : 'Villagers'
  }

  // When rendering active players everywhere, exclude host explicitly
  const activePlayers = players.filter(p => p.is_active && p.is_host !== true)
  const groupAPlayers = activePlayers.filter(p => p.player_group === 'A')
  const groupBPlayers = activePlayers.filter(p => p.player_group === 'B')

  // Voting Status area: add Cancel Vote button for current player when they've voted
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <Header room={room} roomCode={roomCode} gameStatus={gameStatus} currentRound={currentRound} activePlayersCount={activePlayers.length} maxPlayers={room?.max_players ?? null} isHost={isHost} groupA={groupAPlayers.length} groupB={groupBPlayers.length} />
        <HostControls isHost={isHost} gameStatus={gameStatus} activePlayersCount={activePlayers.length} allVotesIn={allVotesIn} revealedTargetId={revealedTargetId} startGame={startGame} revealHighest={revealHighest} finalizeElimination={finalizeElimination} />
        {/* Game Status */}
        {gameStatus === 'waiting' && !isHost && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="text-center">
              <Play className="h-10 w-10 text-blue-600 mx-auto mb-2" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Waiting for Host to Start the Game</h2>
              <p className="text-gray-600">Please wait until the host starts the game.</p>
            </div>
          </div>
        )}
        {/* Game Status */}
        {gameStatus === 'finished' && winner && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="text-center">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {getWinnerLabel(winner)} Wins!
              </h2>
              <p className="text-gray-600">
                Congratulations to all players in {getWinnerLabel(winner)}!
              </p>
            </div>
          </div>
        )}

        {/* Players List */}
        {isHost ? (
          <HostView
            room={room}
            roomCode={roomCode}
            gameStatus={gameStatus}
            currentRound={currentRound}
            activePlayers={activePlayers}
            players={players}
            currentPlayer={currentPlayer}
            votes={votes}
            startGame={startGame}
            revealHighest={revealHighest}
            finalizeElimination={finalizeElimination}
            getVoteCount={getVoteCount}
            hasVoted={hasVoted}
            canVoteFor={canVoteFor}
            onVote={castVote}
          />
        ) : (
          <PlayersView
            room={room}
            roomCode={roomCode}
            gameStatus={gameStatus}
            currentRound={currentRound}
            activePlayers={activePlayers}
            players={players}
            currentPlayer={currentPlayer}
            votes={votes}
            getVoteCount={getVoteCount}
            hasVoted={hasVoted}
            canVoteFor={canVoteFor}
            cancelVote={cancelVote}
            allVotesIn={allVotesIn}
            revealedTargetId={revealedTargetId}
            revealedCount={revealedCount}
            onVote={castVote}
          />
        )}

        {/* Voting Status */}
        {gameStatus === 'voting' && (
          <VotingStatus
            activePlayers={activePlayers}
            getVoteCount={getVoteCount}
            allVotesIn={allVotesIn}
            hasVoted={hasVoted()}
            cancelVote={cancelVote}
            revealedTargetId={revealedTargetId}
            revealedCount={revealedCount}
            players={players}
          />
        )}
      </div>
    </div>
  );
}

