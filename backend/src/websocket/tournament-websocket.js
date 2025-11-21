import fp from 'fastify-plugin';
import { generateBracket, updateBracketWithWinner, advanceRoundIfReady } from './tournament-brackets.js';
import { addVirtualAI } from './virtual-players.js';
import { tournamentEventBus } from './event-bus.js';
import { blockchainWriteMatchOnce, blockchainWriteFinalBracketOnce } from '../services/blockchain.js';

const MIN_MATCH_TIME_LIMIT_SECONDS = 30;
const TOURNAMENT_FORFEIT_GRACE_MS = 5000;
const tournamentDisconnectTimers = new Map();

async function tournamentWebsocket(fastify) {
  // Conexiones por torneo: tournamentId -> Set<{ userId, socket }>
  const connections = new Map();

  async function withTournamentTransaction(work) {
    await fastify.db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const result = await work();
      await fastify.db.exec('COMMIT');
      return result;
    } catch (error) {
      try { await fastify.db.exec('ROLLBACK'); } catch {}
      throw error;
    }
  }

  // Limpieza inicial: Eliminar torneos vacíos o huérfanos
  async function cleanupOrphanedTournaments() {
    try {
      // Eliminar torneos sin jugadores
      const result = await fastify.db.run(`
        DELETE FROM tournaments 
        WHERE id NOT IN (
          SELECT DISTINCT tournament_id FROM tournament_players
        )
        AND status = 'waiting'
      `);

      // Resetear torneos "ready" sin jugadores suficientes de vuelta a "waiting"
      await fastify.db.run(`
        UPDATE tournaments 
        SET status = 'waiting'
        WHERE status = 'ready'
        AND id IN (
          SELECT tournament_id 
          FROM tournament_players 
          GROUP BY tournament_id 
          HAVING COUNT(*) < 8
        )
      `);

    } catch (error) {
      console.error('Error en limpieza de torneos:', error);
    }
  }

  // Ejecutar limpieza al iniciar
  await cleanupOrphanedTournaments();
  setInterval(cleanupOrphanedTournaments, 5 * 60 * 1000);

  // Suscribirse a eventos de resultados de matches
  tournamentEventBus.on('matchResult', async (data) => {
    await handleMatchResult(data.tournamentId, data.matchId, data.winner, data.results, fastify);
  });

  // Helper: Obtener torneo de DB con jugadores
  async function getTournamentState(tournamentId) {
    const tournament = await fastify.db.get(
      `SELECT * FROM tournaments WHERE id = ?`,
      [tournamentId]
    );
    
    if (!tournament) return null;

    const players = await fastify.db.all(
      `SELECT user_id AS userId, username, is_host AS isHost, ready
       FROM tournament_players 
       WHERE tournament_id = ?
       ORDER BY joined_at ASC`,
      [tournament.id]
    );

    return {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      max_players: 8,
      players: players.map(p => ({
        userId: p.userId,
        username: p.username,
        isHost: !!p.isHost,
        ready: !!p.ready
      }))
    };
  }

  // Helper: Broadcast a todos en un torneo
  function broadcast(tournamentId, msg) {
    const set = connections.get(tournamentId);
    if (!set) return;
    
    const payload = JSON.stringify(msg);
    for (const conn of set) {
      try { 
        conn.socket.send(payload);
      } catch (e) {
        console.error(`Failed to send to userId ${conn.userId}:`, e.message);
      }
    }
  }

  function findMatchInBracket(bracket, matchId) {
    if (!bracket?.rounds?.length) return null;
    for (let roundIndex = 0; roundIndex < bracket.rounds.length; roundIndex++) {
      const round = bracket.rounds[roundIndex];
      if (!round?.matches?.length) continue;
      const match = round.matches.find(m => m?.matchId === matchId);
      if (match) {
        return { match, roundIndex };
      }
    }
    return null;
  }

  // Helper: Auth desde cookie
  async function requireUserFromCookie(req) {
    const token = req.cookies?.accessToken;
    if (!token) throw new Error('Unauthorized');
    return fastify.jwt.verify(token);
  }

  // Helper: Iniciar torneo - Generar bracket y crear salas
  async function startTournament(tournamentId, fastify) {
    try {
      // 1. Obtener todos los jugadores del torneo
      const players = await fastify.db.all(
        `SELECT user_id AS userId, username
         FROM tournament_players
         WHERE tournament_id = ?
         ORDER BY joined_at ASC`,
        [tournamentId]
      );

      if (players.length !== 8) {
        console.error(`Error: Torneo ${tournamentId} no tiene 8 jugadores (tiene ${players.length})`);
        return;
      }

      // 2. Generar bracket
      const bracket = generateBracket(players);

      // 3. Guardar bracket en DB
      await fastify.db.run(
        `UPDATE tournaments 
         SET status = 'in_progress', 
             bracket = ?,
             started_at = datetime('now')
         WHERE id = ?`,
        [JSON.stringify(bracket), tournamentId]
      );

      // 4. Preparar TODAS las salas (crear ServerGameSocket para cada una)
      const quarterfinals = bracket.rounds[0].matches;
      const roomIds = [];

      // Obtener configuración del torneo
      const tournamentConfig = await fastify.db.get(
        `SELECT map_key, powerup_amount, enabled_powerups, wind_amount, point_to_win_amount, match_time_limit FROM tournaments WHERE id = ?`,
        [tournamentId]
      );

      // Importar lo necesario
      const { ServerGameSocket } = await import('../game/Game/ServerGameSocket.js');
      const { addGame, startGame: startGameManager } = await import('./game-manager.js');
      const { startTournamentMatch } = await import('./index.js');

      for (let i = 0; i < quarterfinals.length; i++) {
        const match = quarterfinals[i];
        const roomId = `tournament-${tournamentId}-match-${match.matchId}`;

        roomIds.push({
          matchId: match.matchId,
          roomId,
          player1: match.player1,
          player2: match.player2
        });
        
        const matchPlayers = [match.player1, match.player2];
        const rawMatchTimeLimit = Number(tournamentConfig?.match_time_limit);
        const normalizedMatchTimeLimit = Number.isFinite(rawMatchTimeLimit)
          ? Math.max(rawMatchTimeLimit, MIN_MATCH_TIME_LIMIT_SECONDS)
          : null;
        const config = {
          mapKey: tournamentConfig?.map_key || 'ObstacleMap',
          powerUpAmount: tournamentConfig?.powerup_amount || 3,
          enabledPowerUps: JSON.parse(tournamentConfig?.enabled_powerups || '[]'),
          windAmount: tournamentConfig?.wind_amount || 50,
          pointToWinAmount: tournamentConfig?.point_to_win_amount || 5,
          matchTimeLimit: normalizedMatchTimeLimit
        };
        
        // Crear la sala para este match con config
        const gameSocket = new ServerGameSocket(roomId, config);
        addGame(roomId, gameSocket);
        
        // Guardar en pendientes
        if (!global.pendingTournamentMatches) global.pendingTournamentMatches = new Map();
        global.pendingTournamentMatches.set(roomId, { gameSocket, players: matchPlayers, config });
        
        // Si es IA vs IA, iniciar inmediatamente
        const hasRealPlayer = matchPlayers.some(p => p.userId > 0);
        if (!hasRealPlayer) {
          await startTournamentMatch(roomId);
        }
      }

      // 5. Broadcast del bracket completo a todos (incluye toda la info necesaria)
      broadcast(tournamentId, {
        type: 'BracketGenerated',
        tournamentId,
        bracket: {
          currentRound: bracket.currentRound,
          roundName: bracket.rounds[0].name,
          matches: roomIds.map(r => ({
            matchId: r.matchId,
            roomId: r.roomId,
            player1: r.player1,
            player2: r.player2
          }))
        },
        countdown: 10 // Indicar que debe iniciar countdown de 10 segundos
      });


    } catch (error) {
      console.error('Error al iniciar torneo:', error);
      broadcast(tournamentId, {
        type: 'Error',
        message: 'Failed to start tournament'
      });
    }
  }

  // Handler: Auto-unir al jugador al torneo si no está
  async function handlePlayerAutoJoin(tournamentId, user, socket) {
    const alreadyIn = await fastify.db.get(
      `SELECT id FROM tournament_players 
       WHERE tournament_id = ? AND user_id = ?`,
      [tournamentId, user.id]
    );

    if (alreadyIn) return true;

    // Obtener username del usuario
    const userRow = await fastify.db.get(
      `SELECT username FROM users WHERE id = ?`,
      [user.id]
    );
    const username = userRow?.username || user.username || `Player${user.id}`;

    try {
      await fastify.db.run(
        `INSERT INTO tournament_players (tournament_id, user_id, username, is_host, ready)
         VALUES (?, ?, ?, 0, 0)`,
        [tournamentId, user.id, username]
      );

      // Broadcast a OTROS jugadores (no a quien se acaba de unir)
      broadcast(tournamentId, {
        type: 'PlayerJoined',
        userId: user.id,
        username,
        isHost: false,
        ready: false
      });

      return true;

    } catch (error) {
      if (!error.message.includes('UNIQUE constraint')) {
        console.error('Error joining tournament:', error);
        socket.send(JSON.stringify({
          type: 'Error',
          message: 'Failed to join tournament'
        }));
        return false;
      }
      return true;
    }
  }

  // Handler: Toggle ready del jugador
  async function handleToggleReady(tournamentId, userId) {
    // Obtener estado actual
    const current = await fastify.db.get(
      `SELECT ready FROM tournament_players 
       WHERE tournament_id = ? AND user_id = ?`,
      [tournamentId, userId]
    );

    if (!current) return;

    const newReady = current.ready ? 0 : 1;

    // Actualizar en DB
    await fastify.db.run(
      `UPDATE tournament_players SET ready = ? 
       WHERE tournament_id = ? AND user_id = ?`,
      [newReady, tournamentId, userId]
    );

    // Notificar a todos
    broadcast(tournamentId, {
      type: newReady ? 'PlayerReady' : 'PlayerUnready',
      userId
    });

    // Enviar estado actualizado
    const updatedState = await getTournamentState(tournamentId);
    if (updatedState) {
      broadcast(tournamentId, {
        type: 'TournamentState',
        ...updatedState
      });
    }

    // Verificar si todos están ready
    const allPlayers = await fastify.db.all(
      `SELECT ready FROM tournament_players WHERE tournament_id = ?`,
      [tournamentId]
    );

    const allReady = allPlayers.length === 8 && 
                     allPlayers.every(p => p.ready === 1);

    if (allReady) {
      broadcast(tournamentId, { type: 'TournamentStarting' });
      
      // Generar bracket
      await startTournament(tournamentId, fastify);
    }
  }

  // Handler: Invitar AI al torneo
  async function handleInviteAI(tournamentId, userId) {
    // Verificar que el usuario sea el host
    const user = await fastify.db.get(
      `SELECT is_host FROM tournament_players 
       WHERE tournament_id = ? AND user_id = ?`,
      [tournamentId, userId]
    );

    if (!user || !user.is_host) {
      const conn = Array.from(connections.get(tournamentId) || [])
        .find(c => c.userId === userId);
      if (conn) {
        conn.socket.send(JSON.stringify({
          type: 'Error',
          message: 'Only host can invite AI players'
        }));
      }
      return;
    }

    // Verificar que no esté lleno
    const playerCount = await fastify.db.get(
      `SELECT COUNT(*) as count FROM tournament_players 
       WHERE tournament_id = ?`,
      [tournamentId]
    );

    if (playerCount.count >= 8) {
      const conn = Array.from(connections.get(tournamentId) || [])
        .find(c => c.userId === userId);
      if (conn) {
        conn.socket.send(JSON.stringify({
          type: 'Error',
          message: 'Tournament is full (8/8)'
        }));
      }
      return;
    }

    // Crear jugador AI virtual (ID negativo)
    const aiPlayer = addVirtualAI(`tournament-${tournamentId}`);

    // Agregar AI a la base de datos (con ID negativo)
    await fastify.db.run(
      `INSERT INTO tournament_players (tournament_id, user_id, username, is_host, ready)
       VALUES (?, ?, ?, 0, 1)`,
      [tournamentId, aiPlayer.userId, aiPlayer.username]
    );

    // Notificar a todos
    broadcast(tournamentId, {
      type: 'PlayerJoined',
      userId: aiPlayer.userId,
      username: aiPlayer.username,
      isHost: false,
      ready: true
    });

    broadcast(tournamentId, {
      type: 'PlayerReady',
      userId: aiPlayer.userId
    });

    // Enviar estado actualizado
    const updatedState = await getTournamentState(tournamentId);
    if (updatedState) {
      broadcast(tournamentId, {
        type: 'TournamentState',
        ...updatedState
      });
    }

    // Verificar si ahora todos están ready
    const allPlayers = await fastify.db.all(
      `SELECT ready FROM tournament_players WHERE tournament_id = ?`,
      [tournamentId]
    );

    const allReady = allPlayers.length === 8 && 
                     allPlayers.every(p => p.ready === 1);

    if (allReady) {
      broadcast(tournamentId, { type: 'TournamentStarting' });
      await startTournament(tournamentId, fastify);
    }
  }

  // Handler: Reasignar host si el actual se fue
  async function handleHostReassignment(tournamentId) {
    const wasHost = await fastify.db.get(
      `SELECT COUNT(*) as count FROM tournament_players 
       WHERE tournament_id = ? AND is_host = 1`,
      [tournamentId]
    );

    if (wasHost.count > 0) return; // Ya hay un host

    // No hay host, asignar al primer jugador
    const firstPlayer = await fastify.db.get(
      `SELECT user_id FROM tournament_players 
       WHERE tournament_id = ? 
       ORDER BY joined_at ASC LIMIT 1`,
      [tournamentId]
    );

    if (firstPlayer) {
      await fastify.db.run(
        `UPDATE tournament_players SET is_host = 1 
         WHERE tournament_id = ? AND user_id = ?`,
        [tournamentId, firstPlayer.user_id]
      );

      broadcast(tournamentId, {
        type: 'NewHost',
        userId: firstPlayer.user_id
      });
    }
  }

  function getDisconnectKey(tournamentId, userId) {
    return `${tournamentId}:${userId}`;
  }

  function clearPendingForfeitTimer(tournamentId, userId) {
    const key = getDisconnectKey(tournamentId, userId);
    const existing = tournamentDisconnectTimers.get(key);
    if (existing) {
      clearTimeout(existing);
      tournamentDisconnectTimers.delete(key);
    }
  }

  // Handler: Cleanup al desconectar jugador
  async function handlePlayerDisconnect(tournamentId, userId) {
    const tournament = await fastify.db.get(
      `SELECT status, bracket FROM tournaments WHERE id = ?`,
      [tournamentId]
    );

    if (!tournament) return;

    if (tournament.status === 'waiting') {
      await handleWaitingPhaseDisconnect(tournamentId, userId);
      return;
    }

    if (tournament.status === 'in_progress') {
      await handleActiveTournamentDisconnect(tournamentId, userId, tournament.bracket);
    }
  }

  async function handleWaitingPhaseDisconnect(tournamentId, userId) {
    const result = await fastify.db.run(
      `DELETE FROM tournament_players 
       WHERE tournament_id = ? AND user_id = ?`,
      [tournamentId, userId]
    );

    if (result.changes === 0) return;

    broadcast(tournamentId, {
      type: 'PlayerLeft',
      userId
    });

    const remainingPlayers = await fastify.db.get(
      `SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN user_id > 0 THEN 1 END) as real_count
       FROM tournament_players 
       WHERE tournament_id = ?`,
      [tournamentId]
    );

    if (remainingPlayers.total_count === 0) {
      await fastify.db.run(
        `DELETE FROM tournaments WHERE id = ?`,
        [tournamentId]
      );
      connections.delete(tournamentId);
      return;
    }

    if (remainingPlayers.real_count === 0) {
      await fastify.db.run(
        `DELETE FROM tournament_players WHERE tournament_id = ?`,
        [tournamentId]
      );
      await fastify.db.run(
        `DELETE FROM tournaments WHERE id = ?`,
        [tournamentId]
      );
      connections.delete(tournamentId);
      return;
    }

    const updatedState = await getTournamentState(tournamentId);
    if (updatedState) {
      broadcast(tournamentId, {
        type: 'TournamentState',
        ...updatedState
      });
    }

    await handleHostReassignment(tournamentId);
  }

  async function handleActiveTournamentDisconnect(tournamentId, userId, bracketData) {
    const bracket = parseBracket(bracketData);
    if (!bracket) return;

    const matchInfo = findActiveMatchForPlayer(bracket, userId);
    if (!matchInfo?.match || !matchInfo.opponent) {
      return;
    }

    scheduleTournamentForfeit(tournamentId, userId, matchInfo.match.matchId);
  }

  function parseBracket(bracketData) {
    if (!bracketData) return null;
    if (typeof bracketData === 'object') return bracketData;
    try {
      return JSON.parse(bracketData);
    } catch (error) {
      console.error('Failed to parse bracket JSON:', error);
      return null;
    }
  }

  function findActiveMatchForPlayer(bracket, userId) {
    if (!bracket?.rounds?.length) return null;
    const roundIndex = Number.isInteger(bracket.currentRound) ? bracket.currentRound : 0;
    const round = bracket.rounds[roundIndex];
    if (!round?.matches?.length) return null;

    const match = round.matches.find((m) => {
      if (!m || m.status === 'completed') return false;
      return (m.player1?.userId === userId) || (m.player2?.userId === userId);
    });

    if (!match) return null;

    const opponent = match.player1?.userId === userId ? match.player2 : match.player1;

    return { match, opponent };
  }

  function scheduleTournamentForfeit(tournamentId, userId, matchId) {
    const key = getDisconnectKey(tournamentId, userId);
    clearPendingForfeitTimer(tournamentId, userId);

    const timer = setTimeout(async () => {
      tournamentDisconnectTimers.delete(key);
      try {
        await finalizeTournamentForfeit(tournamentId, userId, matchId);
      } catch (error) {
        console.error(`Failed to finalize forfeit for user ${userId} in tournament ${tournamentId}:`, error);
      }
    }, TOURNAMENT_FORFEIT_GRACE_MS);

    tournamentDisconnectTimers.set(key, timer);
  }

  async function finalizeTournamentForfeit(tournamentId, userId, matchId) {
    const tournament = await fastify.db.get(
      `SELECT status, bracket FROM tournaments WHERE id = ?`,
      [tournamentId]
    );

    if (!tournament || tournament.status !== 'in_progress') return;

    const bracket = parseBracket(tournament.bracket);
    if (!bracket?.rounds?.length) return;

    const roundIndex = Number.isInteger(bracket.currentRound) ? bracket.currentRound : 0;
    const round = bracket.rounds[roundIndex];
    if (!round?.matches?.length) return;

    const match = round.matches.find((m) => m?.matchId === matchId);
    if (!match || match.status === 'completed') return;

    const isPlayer1 = match.player1?.userId === userId;
    const isPlayer2 = match.player2?.userId === userId;
    if (!isPlayer1 && !isPlayer2) return;

    const loserInfo = isPlayer1 ? match.player1 : match.player2;
    const winnerInfo = isPlayer1 ? match.player2 : match.player1;

    if (!winnerInfo) {
      console.warn(`Cannot award forfeit in tournament ${tournamentId}, match ${matchId}: missing opponent`);
      return;
    }

    const winnerData = {
      userId: winnerInfo.userId,
      username: winnerInfo.username
    };

    const loserName = loserInfo?.username || `Player${userId}`;
    const winnerName = winnerInfo.username || `Player${winnerInfo.userId}`;

    const resultsPayload = [
      { username: winnerName, score: 1 },
      { username: loserName, score: 0 }
    ];

    await handleMatchResult(
      tournamentId,
      match.matchId,
      winnerData,
      resultsPayload,
      fastify
    );

    broadcast(tournamentId, {
      type: 'TournamentForfeitWin',
      tournamentId,
      matchId: match.matchId,
      winner: winnerData,
      loser: {
        userId,
        username: loserName
      }
    });

    await notifyGamePlayersOfForfeit(
      `tournament-${tournamentId}-match-${match.matchId}`,
      resultsPayload
    );
  }

  async function notifyGamePlayersOfForfeit(roomId, resultsPayload) {
    const message = {
      type: 'GameEnded',
      results: resultsPayload,
      reason: 'opponent_disconnected',
      metadata: {
        reason: 'opponent_disconnected'
      }
    };

    if (global.pendingTournamentMatches?.has(roomId)) {
      const pendingMatches = global.pendingTournamentMatches;
      const pending = pendingMatches.get(roomId);
      try {
        pending?.gameSocket?.Broadcast?.(message);
        pending?.gameSocket?.Dispose?.();
      } catch (error) {
        console.error(`Failed to notify pending match ${roomId} about forfeit:`, error);
      }
      pendingMatches.delete(roomId);
      return;
    }

    try {
      const { getGame, removeGame } = await import('./game-manager.js');
      const gameSocket = getGame(roomId);
      if (gameSocket) {
        try {
          gameSocket.Broadcast(message);
        } catch (error) {
          console.error(`Failed to broadcast forfeit GameEnded message for ${roomId}:`, error);
        }
        removeGame(roomId);
      }
    } catch (error) {
      console.error(`Failed to clean up active game for ${roomId}:`, error);
    }
  }

  async function persistTournamentMatchResult(tournamentId, matchId, winnerData, results) {
    return withTournamentTransaction(async () => {
      const row = await fastify.db.get(
        `SELECT status, bracket FROM tournaments WHERE id = ?`,
        [tournamentId]
      );

      if (!row || row.status !== 'in_progress') {
        return null;
      }

      const bracket = parseBracket(row.bracket);
      if (!bracket) return null;

      const matchInfo = findMatchInBracket(bracket, matchId);
      if (!matchInfo?.match) {
        console.warn(`Match ${matchId} not found in bracket for tournament ${tournamentId}`);
        return null;
      }

      if (matchInfo.match.status === 'completed') {
        return { bracket, advanceResult: null, alreadyProcessed: true };
      }

      const player1Score = results.find(r => r.username === matchInfo.match.player1?.username)?.score || 0;
      const player2Score = results.find(r => r.username === matchInfo.match.player2?.username)?.score || 0;

      matchInfo.match.winner = winnerData;
      matchInfo.match.status = 'completed';
      matchInfo.match.score1 = player1Score;
      matchInfo.match.score2 = player2Score;

      const advanceResult = advanceRoundIfReady(bracket);

      await fastify.db.run(
        `UPDATE tournaments SET bracket = ? WHERE id = ?`,
        [JSON.stringify(bracket), tournamentId]
      );

      if (advanceResult?.tournamentFinished) {
        const winnerId = (advanceResult.winner?.userId ?? null);
        const persistedWinnerId = typeof winnerId === 'number' && winnerId > 0 ? winnerId : null;
        await fastify.db.run(
          `UPDATE tournaments 
             SET status = 'finished', 
                 finished_at = datetime('now'),
                 winner_id = ?
           WHERE id = ?`,
          [persistedWinnerId, tournamentId]
        );
      }

      return { bracket, advanceResult };
    });
  }

  // Handler: Iniciar match de torneo cuando el countdown termina
  async function handleTournamentMatchStart(roomId, fastify) {
    try {
      const { startTournamentMatch } = await import('./index.js');
      await startTournamentMatch(roomId);
    } catch (error) {
      console.error(`Error iniciando match ${roomId}:`, error);
    }
  }

  // Handler: Procesar resultado de match de torneo
  async function handleMatchResult(tournamentId, matchId, winner, results, fastify) {
    try {

      // 1. Obtener bracket actual de la base de datos
      const tournament = await fastify.db.get(
        `SELECT bracket FROM tournaments WHERE id = ? AND status = 'in_progress'`,
        [tournamentId]
      );

      if (!tournament) {
        return;
      }

      const bracket = JSON.parse(tournament.bracket);

      // 2. Convertir username a userId para el ganador
      let winnerPlayer = await fastify.db.get(
        `SELECT user_id AS userId, username FROM tournament_players 
         WHERE tournament_id = ? AND username = ?`,
        [tournamentId, winner.username]
      );

      if (!winnerPlayer) {
        const matchEntry = bracket.rounds[bracket.currentRound]?.matches.find(m => m.matchId === matchId);
        const fallbackPlayer = [matchEntry?.player1, matchEntry?.player2]
          .filter(Boolean)
          .find(p => p.username === winner.username);

        if (fallbackPlayer) {
          winnerPlayer = {
            userId: fallbackPlayer.userId,
            username: fallbackPlayer.username
          };
        } else {
          console.warn(`No se pudo determinar el ganador para torneo ${tournamentId}, match ${matchId}`);
          return;
        }
      }

      const winnerData = {
        userId: winnerPlayer.userId,
        username: winnerPlayer.username
      };

      const persistedResult = await persistTournamentMatchResult(
        tournamentId,
        matchId,
        winnerData,
        results
      );

      if (!persistedResult || persistedResult.alreadyProcessed) {
        return;
      }

      const { bracket: updatedBracket, advanceResult } = persistedResult;

      // Obtener información del match para blockchain
      const matchInfo = findMatchInBracket(updatedBracket, matchId);
      if (matchInfo?.match) {
        // Escribir resultado del match en blockchain
        try {
          await blockchainWriteMatchOnce(fastify, {
            tournamentId,
            matchId,
            player1: matchInfo.match.player1?.username || 'TBD',
            player2: matchInfo.match.player2?.username || 'TBD',
            winner: winnerData.username,
            score1: matchInfo.match.score1 || 0,
            score2: matchInfo.match.score2 || 0
          });
        } catch (e) {
          console.error('Failed blockchain store match on-chain:', e);
        }
      }

      broadcast(tournamentId, {
        type: 'BracketUpdated',
        tournamentId,
        bracket: updatedBracket
      });
      
      if (advanceResult?.tournamentFinished) {
        // Escribir bracket final en blockchain
        try {
          await blockchainWriteFinalBracketOnce(fastify, tournamentId, updatedBracket);
        } catch (e) {
          console.error('Failed blockchain store final bracket on-chain:', e);
        }

        broadcast(tournamentId, {
          type: 'TournamentFinished',
          winner: advanceResult.winner,
          tournamentId
        });

      } else if (advanceResult?.nextRound) {
        // Nueva ronda iniciada
        const nextRound = advanceResult.nextRound;
        const roundNumber = advanceResult.roundNumber;

        // Crear roomIds para la nueva ronda
        const roomIds = nextRound.matches.map(match => ({
          matchId: match.matchId,
          roomId: `tournament-${tournamentId}-match-${match.matchId}`,
          player1: match.player1,
          player2: match.player2
        }));

        // Preparar y crear TODAS las salas de la nueva ronda
        const tournamentConfig = await fastify.db.get(
          `SELECT map_key, powerup_amount, enabled_powerups, wind_amount, point_to_win_amount, match_time_limit FROM tournaments WHERE id = ?`,
          [tournamentId]
        );

        const { ServerGameSocket } = await import('../game/Game/ServerGameSocket.js');
        const { addGame } = await import('./game-manager.js');
        const { startTournamentMatch } = await import('./index.js');

        for (const roomInfo of roomIds) {
          const matchPlayers = [roomInfo.player1, roomInfo.player2];
        const rawMatchTimeLimit = Number(tournamentConfig?.match_time_limit);
        const normalizedMatchTimeLimit = Number.isFinite(rawMatchTimeLimit)
          ? Math.max(rawMatchTimeLimit, MIN_MATCH_TIME_LIMIT_SECONDS)
          : null;
        const config = {
            mapKey: tournamentConfig?.map_key || 'ObstacleMap',
            powerUpAmount: tournamentConfig?.powerup_amount || 3,
            enabledPowerUps: JSON.parse(tournamentConfig?.enabled_powerups || '[]'),
            windAmount: tournamentConfig?.wind_amount || 50,
            pointToWinAmount: tournamentConfig?.point_to_win_amount || 5,
            matchTimeLimit: normalizedMatchTimeLimit
          };
          
          // Crear la sala para este match con config
          const gameSocket = new ServerGameSocket(roomInfo.roomId, config);
          addGame(roomInfo.roomId, gameSocket);
          
          // Guardar en pendientes
          if (!global.pendingTournamentMatches) global.pendingTournamentMatches = new Map();
          global.pendingTournamentMatches.set(roomInfo.roomId, { gameSocket, players: matchPlayers, config });
          
          // Si es IA vs IA, iniciar inmediatamente
          const hasRealPlayer = matchPlayers.some(p => p.userId > 0);
          if (!hasRealPlayer) {
            await startTournamentMatch(roomInfo.roomId);
          }
        }

        broadcast(tournamentId, {
          type: 'RoundAdvanced',
          tournamentId,
          roundNumber,
          roundName: updatedBracket.rounds[roundNumber].name,
          matches: roomIds,
          countdown: 10 // Indicar que debe iniciar countdown de 10 segundos
        });


      } else {
        // Solo se completó un match, pero la ronda sigue en progreso
        // BracketUpdated ya se envió arriba, solo enviar evento específico del match
        broadcast(tournamentId, {
          type: 'MatchCompleted',
          tournamentId,
          matchId,
          winner: winnerData
        });
      }

    } catch (error) {
      console.error('❌ Error procesando resultado de match:', error);
      
      // Notificar error a los jugadores conectados
      broadcast(tournamentId, {
        type: 'Error',
        message: 'Error procesando resultado del match'
      });
    }
  }

  // WebSocket endpoint
  fastify.get('/tournamentws', { websocket: true }, async (socket, req) => {
    let user;
    try {
      user = await requireUserFromCookie(req);
    } catch {
      try { socket.close(1008, 'Unauthorized'); } catch {}
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const tournamentId = parseInt(url.searchParams.get('tournament') || '0');

    if (!tournamentId) {
      try { socket.close(1008, 'No tournament ID'); } catch {}
      return;
    }

    clearPendingForfeitTimer(tournamentId, user.id);

    // Registrar conexión
    let set = connections.get(tournamentId);
    if (!set) {
      set = new Set();
      connections.set(tournamentId, set);
    }
    const conn = { userId: user.id, socket };
    set.add(conn);

    // Auto-unir al jugador si no está en el torneo
    const joined = await handlePlayerAutoJoin(tournamentId, user, socket);
    if (!joined) return;

    // Enviar estado inicial
    const state = await getTournamentState(tournamentId);
    if (state) {
      socket.send(JSON.stringify({
        type: 'TournamentState',
        ...state
      }));
    }

    // Manejar mensajes
    socket.on('message', async (buf) => {
      try {
        const msg = JSON.parse(buf.toString());

        switch (msg.type) {
          case 'ToggleReady':
            await handleToggleReady(tournamentId, user.id);
            break;

          case 'InviteAI':
            await handleInviteAI(tournamentId, user.id);
            break;

          case 'TournamentMatchStart':
            await handleTournamentMatchStart(msg.roomId, fastify);
            break;

          default:
            socket.send(JSON.stringify({ 
              type: 'Error', 
              message: `Unknown message type: ${msg.type}` 
            }));
        }
      } catch (e) {
        socket.send(JSON.stringify({ 
          type: 'Error', 
          message: 'Invalid message format' 
        }));
      }
    });

    // Cleanup al desconectar
    socket.on('close', async () => {
      const s = connections.get(tournamentId);
      if (s) s.delete(conn);

      await handlePlayerDisconnect(tournamentId, user.id);
    });
  });

  console.log('✅ Tournament WebSocket registered at /tournamentws');
}

export default fp(tournamentWebsocket, { name: 'tournament-websocket' });