'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase, type Room, type Player, type Vote } from '@/lib/supabase'
import { 
  Users, 
  Play, 
  Crown, 
  UserCheck, 
  UserX, 
  Trophy,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'

// PlayerCard props interface
interface PlayerCardProps {
  player: Player
  currentPlayer: Player | null
  gameStatus: string
  voteCount: number
  hasVoted: boolean
  canVoteFor: boolean
  onVote: (playerId: string) => void
  showGroup?: boolean
}

// PlayerCard component
function PlayerCard({
  player,
  currentPlayer,
  gameStatus,
  voteCount,
  hasVoted,
  canVoteFor,
  onVote,
  showGroup = false
}: PlayerCardProps) {
  const isCurrentPlayer = currentPlayer?.id === player.id
  const isHost = player.is_host
  return (
    <div className={`p-4 rounded-lg border-2 ${
      isCurrentPlayer
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isHost ? (
            <Crown className="h-5 w-5 text-yellow-500" />
          ) : (
            <Users className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <div className="font-medium text-gray-900">
              {player.name}
              {isCurrentPlayer && ' (You)'}
            </div>
            {showGroup && player.player_group && (
              <div className="text-sm text-gray-600">
                Group: {player.player_group}
              </div>
            )}
            {showGroup && !player.player_group && (
              <div className="text-sm text-gray-600">
                Host (No Group)
              </div>
            )}
            {gameStatus === 'playing' && (
              <div className="text-sm text-gray-600">
                Votes: {voteCount}
              </div>
            )}
          </div>
        </div>
        {gameStatus === 'voting' && !isCurrentPlayer && canVoteFor && !hasVoted && (
          <button
            onClick={() => onVote(player.id)}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            disabled={gameStatus !== 'voting'}
          >
            Vote
          </button>
        )}
        {gameStatus === 'voting' && hasVoted && !isCurrentPlayer && (
          <XCircle className="h-5 w-5 text-gray-400" />
        )}
      </div>
    </div>
  )
}

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
          return;
        }

        if (existingPlayers && existingPlayers.length >= roomData.max_players) {
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
          processVotingRound(updatedVotes)
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
      await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', room.id)
    } catch (error) {
      console.error('Error starting game:', error)
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

    try {
      await supabase
        .from('votes')
        .insert({
          room_id: room.id,
          voter_id: currentPlayer.id,
          target_id: targetPlayerId,
          round: currentRound
        })
    } catch (error) {
      console.error('Error casting vote:', error)
    }
  }

  const processVotingRound = async (currentVotes: Vote[]) => {
    if (!room) return

    const activePlayers = players.filter(p => p.is_active && !p.is_host) // Exclude host from voting
    if (currentVotes.length < activePlayers.length) return

    // Count votes
    const voteCounts: { [key: string]: number } = {}
    currentVotes.forEach(vote => {
      voteCounts[vote.target_id] = (voteCounts[vote.target_id] || 0) + 1
    })

    // Find player with most votes
    const maxVotes = Math.max(...Object.values(voteCounts))
    const eliminatedPlayerId = Object.keys(voteCounts).find(
      playerId => voteCounts[playerId] === maxVotes
    )

    if (eliminatedPlayerId) {
      // Eliminate player
      await supabase
        .from('players')
        .update({ is_active: false })
        .eq('id', eliminatedPlayerId)

      // Move to next round
      setCurrentRound(prev => prev + 1)
      setVotes([])
    }
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

  const hasVoted = () => {
    return votes.some(vote => vote.voter_id === currentPlayer?.id)
  }

  const canVoteFor = (playerId: string) => {
    return playerId !== currentPlayer?.id && !hasVoted()
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const errorMsg = error;
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{errorMsg}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const activePlayers = players.filter(p => p.is_active && !p.is_host) // Exclude host from active players
  const groupAPlayers = activePlayers.filter(p => p.player_group === 'A')
  const groupBPlayers = activePlayers.filter(p => p.player_group === 'B')

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {room?.room_name || 'Wolf Game Room'}
              </h1>
              <p className="text-gray-600">Room Code: {roomCode}</p>
              <p className="text-gray-600">
                {gameStatus === 'waiting' && 'Waiting for players...'}
                {gameStatus === 'playing' && 'Game started - Ready for voting!'}
                {gameStatus === 'voting' && `Round ${currentRound}`}
                {gameStatus === 'finished' && 'Game Finished!'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Players: {activePlayers.length}/{room?.max_players}</div>
              {isHost && (
                <div className="text-sm text-gray-600">
                  Group A: {groupAPlayers.length} | Group B: {groupBPlayers.length}
                </div>
              )}
            </div>
          </div>
        </div>

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

        {/* Host Controls */}
        {isHost && gameStatus === 'waiting' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Host Controls</h3>
                <p className="text-gray-600">
                  {activePlayers.length >= 4 ? 'Ready to start the game!' : 'Need at least 4 players'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Players List */}
        {isHost ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Group A */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-blue-600" />
                {getGroupLabel('A')} ({groupAPlayers.length})
              </h3>
              <div className="space-y-3">
                {groupAPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    currentPlayer={currentPlayer}
                    gameStatus={gameStatus}
                    voteCount={getVoteCount(player.id)}
                    hasVoted={hasVoted()}
                    canVoteFor={canVoteFor(player.id)}
                    onVote={castVote}
                    showGroup={true}
                  />
                ))}
              </div>
            </div>
            {/* Group B */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Crown className="h-5 w-5 mr-2 text-red-600" />
                {getGroupLabel('B')} ({groupBPlayers.length})
              </h3>
              <div className="space-y-3">
                {groupBPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    currentPlayer={currentPlayer}
                    gameStatus={gameStatus}
                    voteCount={getVoteCount(player.id)}
                    hasVoted={hasVoted()}
                    canVoteFor={canVoteFor(player.id)}
                    onVote={castVote}
                    showGroup={true}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-gray-600" />
              All Players ({activePlayers.length})
            </h3>
            <div className="space-y-3">
              {activePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  currentPlayer={currentPlayer}
                  gameStatus={gameStatus}
                  voteCount={getVoteCount(player.id)}
                  hasVoted={hasVoted()}
                  canVoteFor={canVoteFor(player.id)}
                  onVote={castVote}
                  showGroup={gameStatus === 'finished'}
                />
              ))}
            </div>
            {gameStatus === 'finished' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Your Group:</strong> {currentPlayer?.player_group}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Game finished! See all group assignments above.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Voting Status */}
        {gameStatus === 'voting' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Voting Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activePlayers.map(player => (
                <div key={player.id} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900">{player.name}</div>
                  <div className="text-sm text-gray-600">
                    Votes: {getVoteCount(player.id)}
                  </div>
                </div>
              ))}
            </div>
            {hasVoted() && (
              <div className="mt-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">You have voted!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

