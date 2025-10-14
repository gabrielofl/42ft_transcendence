// Tournament WebSocket - Sistema de torneos en tiempo real
// Inspirado en waitroom-websocket.js pero simplificado para torneos

import fp from 'fastify-plugin';

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

  // Limpieza periódica cada 5 minutos
  setInterval(cleanupOrphanedTournaments, 5 * 60 * 1000);

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

    // Asegurar que el usuario esté en el torneo
    const alreadyIn = await fastify.db.get(
      `SELECT id FROM tournament_players 
       WHERE tournament_id = ? AND user_id = ?`,
      [tournamentId, user.id]
    );

    if (!alreadyIn) {
      // Unirse automáticamente
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

      } catch (error) {
        if (!error.message.includes('UNIQUE constraint')) {
          console.error('Error joining tournament:', error);
          socket.send(JSON.stringify({
            type: 'Error',
            message: 'Failed to join tournament'
          }));
          return;
        }
      }
    }

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
          case 'ToggleReady': {
            // Obtener estado actual
            const current = await fastify.db.get(
              `SELECT ready FROM tournament_players 
               WHERE tournament_id = ? AND user_id = ?`,
              [tournamentId, user.id]
            );

            if (!current) break;

            const newReady = current.ready ? 0 : 1;

            // Actualizar en DB
            await fastify.db.run(
              `UPDATE tournament_players SET ready = ? 
               WHERE tournament_id = ? AND user_id = ?`,
              [newReady, tournamentId, user.id]
            );

            // Notificar a todos
            broadcast(tournamentId, {
              type: newReady ? 'PlayerReady' : 'PlayerUnready',
              userId: user.id
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
              
              // TODO: Generar bracket y crear salas (siguiente paso)
            }
            break;
          }

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

      // Obtener estado del torneo
      const tournament = await fastify.db.get(
        `SELECT status FROM tournaments WHERE id = ?`,
        [tournamentId]
      );

      if (!tournament) return;

      // Solo limpiar si el torneo está en waiting (no ha empezado)
      if (tournament.status === 'waiting') {
        // Quitar jugador del torneo
        const result = await fastify.db.run(
          `DELETE FROM tournament_players 
           WHERE tournament_id = ? AND user_id = ?`,
          [tournamentId, user.id]
        );

        if (result.changes > 0) {
          // Notificar a otros jugadores que salió
          broadcast(tournamentId, {
            type: 'PlayerLeft',
            userId: user.id
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

            // Si el que salió era el host, asignar nuevo host
            const wasHost = await fastify.db.get(
              `SELECT COUNT(*) as count FROM tournament_players 
               WHERE tournament_id = ? AND is_host = 1`,
              [tournamentId]
            );

            if (wasHost.count === 0) {
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
          }
        }
      }
    });
  });

  console.log('✅ Tournament WebSocket registered at /tournamentws');
}

export default fp(tournamentWebsocket, { name: 'tournament-websocket' });

