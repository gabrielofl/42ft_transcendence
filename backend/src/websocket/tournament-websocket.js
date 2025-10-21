// Tournament WebSocket - Sistema de torneos en tiempo real
// Inspirado en waitroom-websocket.js pero simplificado para torneos

import fp from 'fastify-plugin';
import { generateBracket, updateBracketWithWinner, advanceRoundIfReady } from './tournament-brackets.js';
import { addVirtualAI } from './virtual-players.js';
import { tournamentEventBus } from './event-bus.js';

async function tournamentWebsocket(fastify) {
  // Conexiones por torneo: tournamentId -> Set<{ userId, socket }>
  const connections = new Map();

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

      // 4. Preparar info de salas (no pre-crear, /gamews las crea cuando jugadores conectan)
      const quarterfinals = bracket.rounds[0].matches;
      const roomIds = [];

      for (let i = 0; i < quarterfinals.length; i++) {
        const match = quarterfinals[i];
        const roomId = `tournament-${tournamentId}-match-${match.matchId}`;

        roomIds.push({
          matchId: match.matchId,
          roomId,
          player1: match.player1,
          player2: match.player2
        });
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
        }
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

  // Handler: Cleanup al desconectar jugador
  async function handlePlayerDisconnect(tournamentId, userId) {
    // Obtener estado del torneo
    const tournament = await fastify.db.get(
      `SELECT status FROM tournaments WHERE id = ?`,
      [tournamentId]
    );

    if (!tournament) return;

    // Solo limpiar si el torneo está en waiting (no ha empezado)
    if (tournament.status !== 'waiting') return;

    // Quitar jugador del torneo
    const result = await fastify.db.run(
      `DELETE FROM tournament_players 
       WHERE tournament_id = ? AND user_id = ?`,
      [tournamentId, userId]
    );

    if (result.changes === 0) return;

    // Notificar a otros jugadores que salió
    broadcast(tournamentId, {
      type: 'PlayerLeft',
      userId
    });

    // Verificar cuántos jugadores quedan
    const remainingPlayers = await fastify.db.get(
      `SELECT COUNT(*) as count FROM tournament_players 
       WHERE tournament_id = ?`,
      [tournamentId]
    );

    if (remainingPlayers.count === 0) {
      // Torneo vacío → Eliminarlo
      await fastify.db.run(
        `DELETE FROM tournaments WHERE id = ?`,
        [tournamentId]
      );
      
      // Limpiar conexiones
      connections.delete(tournamentId);
    } else {
      // Enviar estado actualizado a los que quedan
      const updatedState = await getTournamentState(tournamentId);
      if (updatedState) {
        broadcast(tournamentId, {
          type: 'TournamentState',
          ...updatedState
        });
      }

      // Reasignar host si es necesario
      await handleHostReassignment(tournamentId);
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
      const winnerPlayer = await fastify.db.get(
        `SELECT user_id AS userId, username FROM tournament_players 
         WHERE tournament_id = ? AND username = ?`,
        [tournamentId, winner.username]
      );

      if (!winnerPlayer) {
        return;
      }

      const winnerData = {
        userId: winnerPlayer.userId,
        username: winnerPlayer.username
      };

      // 3. Actualizar bracket con el ganador
      updateBracketWithWinner(bracket, matchId, winnerData);

      // 4. Verificar si la ronda está completa y avanzar si es necesario
      const advanceResult = advanceRoundIfReady(bracket);

      // 5. Guardar bracket actualizado en la base de datos
      await fastify.db.run(
        `UPDATE tournaments SET bracket = ? WHERE id = ?`,
        [JSON.stringify(bracket), tournamentId]
      );

      // 6. Broadcast actualización a todos los jugadores conectados
      if (advanceResult?.tournamentFinished) {
        // Torneo terminado
        await fastify.db.run(
          `UPDATE tournaments SET status = 'finished', finished_at = datetime('now') WHERE id = ?`,
          [tournamentId]
        );

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

        broadcast(tournamentId, {
          type: 'RoundAdvanced',
          tournamentId,
          roundNumber,
          roundName: bracket.rounds[roundNumber].name,
          matches: roomIds
        });


      } else {
        // Solo se completó un match, pero la ronda sigue en progreso
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

