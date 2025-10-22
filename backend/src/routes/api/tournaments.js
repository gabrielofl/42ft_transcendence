// Tournament REST API - Endpoints para torneos

export default async function (fastify, opts) {
  // Registrar rutas con prefijo explícito
  fastify.register(async function (fastify, opts) {
    
    // POST /api/tournaments - Crear torneo
    fastify.post('/tournaments', async (req, reply) => {
    try {
      const token = req.cookies?.accessToken;
      if (!token) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const user = fastify.jwt.verify(token);
      const { 
        name, 
        mapKey = 'ObstacleMap',
        powerUpAmount = 3,
        enabledPowerUps = [],
        windAmount = 50,
        matchTimeLimit = 180
      } = req.body || {};

      const tournamentName = name || `Tournament #${Date.now()}`;

      // Encontrar el menor ID libre (solo reutilizar IDs de torneos ELIMINADOS)
      // No reutilizar IDs de torneos activos (waiting/in_progress) ni históricos (finished)
      const findFreeId = await fastify.db.get(`
        WITH RECURSIVE ids(id) AS (
          SELECT 1
          UNION ALL
          SELECT id + 1 FROM ids WHERE id < 1000
        )
        SELECT ids.id
        FROM ids
        LEFT JOIN tournaments t ON t.id = ids.id
        WHERE t.id IS NULL
        LIMIT 1
      `);
      
      const nextId = findFreeId?.id || null;

      // Crear torneo en DB con ID específico
      if (nextId) {
        await fastify.db.run(
          `INSERT INTO tournaments (id, name, creator_id, status, map_key, powerup_amount, enabled_powerups, wind_amount, match_time_limit)
           VALUES (?, ?, ?, 'waiting', ?, ?, ?, ?, ?)`,
          [nextId, tournamentName, user.id, mapKey, powerUpAmount, JSON.stringify(enabledPowerUps), windAmount, matchTimeLimit]
        );
      } else {
        // Fallback: dejar que AUTOINCREMENT asigne
        await fastify.db.run(
          `INSERT INTO tournaments (name, creator_id, status, map_key, powerup_amount, enabled_powerups, wind_amount, match_time_limit)
           VALUES (?, ?, 'waiting', ?, ?, ?, ?, ?)`,
          [tournamentName, user.id, mapKey, powerUpAmount, JSON.stringify(enabledPowerUps), windAmount, matchTimeLimit]
        );
      }

      const tournamentId = nextId || (await fastify.db.get('SELECT last_insert_rowid() as id')).id;

      // Obtener username del creador
      const userRow = await fastify.db.get(
        `SELECT username FROM users WHERE id = ?`,
        [user.id]
      );
      const username = userRow?.username || user.username || `Player${user.id}`;

      // Agregar creador como primer jugador
      await fastify.db.run(
        `INSERT INTO tournament_players (tournament_id, user_id, username, is_host, ready)
         VALUES (?, ?, ?, 1, 0)`,
        [tournamentId, user.id, username]
      );

      return { 
        tournamentId,
        name: tournamentName,
        creator_id: user.id
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create tournament' });
    }
  });

  // GET /api/tournaments - Listar torneos disponibles  
  fastify.get('/tournaments', async (req, reply) => {
    try {
      const tournaments = await fastify.db.all(
        `SELECT 
          t.id,
          t.name,
          t.status,
          t.created_at,
          t.map_key,
          t.powerup_amount,
          t.enabled_powerups,
          t.wind_amount,
          t.match_time_limit,
          COUNT(tp.id) as player_count
         FROM tournaments t
         LEFT JOIN tournament_players tp ON tp.tournament_id = t.id
         WHERE t.status IN ('waiting', 'ready')
         GROUP BY t.id, t.name, t.status, t.created_at, t.map_key, t.powerup_amount, t.enabled_powerups, t.wind_amount, t.match_time_limit
         HAVING player_count > 0 AND player_count < 8
         ORDER BY t.created_at DESC
         LIMIT 20`
      );

      return { tournaments };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to list tournaments' });
    }
  });

  // DELETE /api/tournaments/cleanup - Limpieza manual de torneos (temporal)
  fastify.delete('/tournaments/cleanup', async (req, reply) => {
    try {
      // Solo permitir en desarrollo
      if (process.env.NODE_ENV === 'production') {
        return reply.code(403).send({ error: 'Not allowed in production' });
      }

      // 1. Eliminar todos los registros de tournament_players
      const playersDeleted = await fastify.db.run(
        `DELETE FROM tournament_players`
      );

      // 2. Eliminar todos los torneos en estado waiting/ready
      const tournamentsDeleted = await fastify.db.run(
        `DELETE FROM tournaments WHERE status IN ('waiting', 'ready')`
      );

      return {
        message: 'Cleanup completed',
        playersDeleted: playersDeleted.changes,
        tournamentsDeleted: tournamentsDeleted.changes
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Cleanup failed' });
    }
  });

  // GET /api/tournaments/:id - Obtener torneo específico
  fastify.get('/tournaments/:id', async (req, reply) => {
    try {
      const { id } = req.params;

      const tournament = await fastify.db.get(
        `SELECT 
          id, name, status, map_key, powerup_amount, enabled_powerups, 
          wind_amount, match_time_limit, bracket, created_at, started_at, finished_at
         FROM tournaments WHERE id = ?`,
        [id]
      );

      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      const players = await fastify.db.all(
        `SELECT user_id AS userId, username, is_host AS isHost, ready
         FROM tournament_players
         WHERE tournament_id = ?
         ORDER BY joined_at ASC`,
        [id]
      );

      return {
        id: tournament.id,
        name: tournament.name,
        creator_id: tournament.creator_id,
        status: tournament.status,
        max_players: 8,
        map_key: tournament.map_key,
        powerup_amount: tournament.powerup_amount,
        enabled_powerups: JSON.parse(tournament.enabled_powerups || '[]'),
        wind_amount: tournament.wind_amount,
        match_time_limit: tournament.match_time_limit,
        bracket: tournament.bracket || null, // Devolver bracket como string JSON
        created_at: tournament.created_at,
        started_at: tournament.started_at,
        finished_at: tournament.finished_at,
        players: players.map(p => ({
          userId: p.userId,
          username: p.username,
          isHost: !!p.isHost,
          ready: !!p.ready
        }))
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get tournament' });
    }
  });
  
  });
}

