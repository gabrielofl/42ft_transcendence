// WebSocket Database Handler - Manejador de base de datos para WebSockets

/**
 * Obtiene información completa de un usuario desde la base de datos
 * @param {Object} db - Instancia de la base de datos
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object|null>} - Información del usuario o null si no existe
 */
export async function getUserInfo(db, userId) {
  try {
    const user = await db.get(`
      SELECT 
        id,
        username,
        avatar,
        status,
        wins,
        losses,
        created_at,
        last_login
      FROM users 
      WHERE id = ?
    `, [userId]);

    if (user) {
      // Calcular estadísticas adicionales
      const totalGames = user.wins + user.losses;
      const winRate = totalGames > 0 ? ((user.wins / totalGames) * 100).toFixed(1) : 0;
      
      return {
        ...user,
        totalGames,
        winRate: parseFloat(winRate),
        isOnline: user.status === 1
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de juego de un usuario
 * @param {Object} db - Instancia de la base de datos
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} - Estadísticas del usuario
 */
export async function getUserStats(db, userId) {
  try {
    // Obtener estadísticas básicas
    const user = await db.get(`
      SELECT wins, losses FROM users WHERE id = ?
    `, [userId]);

    if (!user) {
      return { error: 'Usuario no encontrado' };
    }

    // Obtener historial de juegos recientes
    const recentGames = await db.all(`
      SELECT 
        g.id,
        g.player1_score,
        g.player2_score,
        g.status,
        g.created_at,
        g.finished_at,
        u1.username as player1_name,
        u2.username as player2_name,
        CASE 
          WHEN g.winner_id = ? THEN 'victory'
          WHEN g.winner_id IS NOT NULL AND g.winner_id != ? THEN 'defeat'
          ELSE 'pending'
        END as result
      FROM games g
      JOIN users u1 ON g.player1_id = u1.id
      JOIN users u2 ON g.player2_id = u2.id
      WHERE (g.player1_id = ? OR g.player2_id = ?)
        AND g.status = 'finished'
      ORDER BY g.finished_at DESC
      LIMIT 10
    `, [userId, userId, userId, userId]);

    // Obtener estadísticas por mes (últimos 6 meses)
    const monthlyStats = await db.all(`
      SELECT 
        strftime('%Y-%m', g.finished_at) as month,
        COUNT(*) as totalGames,
        SUM(CASE WHEN g.winner_id = ? THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN g.winner_id != ? AND g.winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses
      FROM games g
      WHERE (g.player1_id = ? OR g.player2_id = ?)
        AND g.status = 'finished'
        AND g.finished_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', g.finished_at)
      ORDER BY month DESC
    `, [userId, userId, userId, userId]);

    return {
      basic: {
        wins: user.wins,
        losses: user.losses,
        totalGames: user.wins + user.losses,
        winRate: user.wins + user.losses > 0 ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) : 0
      },
      recentGames,
      monthlyStats
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}

/**
 * Obtiene el leaderboard de jugadores
 * @param {Object} db - Instancia de la base de datos
 * @param {number} limit - Límite de resultados (por defecto 50)
 * @returns {Promise<Array>} - Lista de jugadores ordenados por victorias
 */
export async function getLeaderboard(db, limit = 50) {
  try {
    const leaderboard = await db.all(`
      SELECT 
        id,
        username,
        avatar,
        wins,
        losses,
        (wins + losses) as totalGames,
        CASE 
          WHEN (wins + losses) > 0 
          THEN ROUND((wins * 100.0) / (wins + losses), 1)
          ELSE 0 
        END as winRate,
        status,
        created_at
      FROM users
      WHERE (wins + losses) > 0
      ORDER BY wins DESC, winRate DESC
      LIMIT ?
    `, [limit]);

    // Agregar ranking
    return leaderboard.map((player, index) => ({
      ...player,
      rank: index + 1,
      isOnline: player.status === 1
    }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
}

/**
 * Obtiene torneos desde la base de datos
 * @param {Object} db - Instancia de la base de datos
 * @param {string|null} status - Filtro por estado (opcional)
 * @returns {Promise<Array>} - Lista de torneos
 */
export async function getTournamentsFromDB(db, status = null) {
  try {
    let query = `
      SELECT 
        t.id,
        t.name,
        t.status,
        t.created_at,
        t.started_at,
        t.finished_at,
        COUNT(g.id) as totalGames,
        COUNT(CASE WHEN g.status = 'finished' THEN 1 END) as completedGames
      FROM tournaments t
      LEFT JOIN games g ON g.tournament_id = t.id
    `;
    
    const params = [];
    if (status) {
      query += ' WHERE t.status = ?';
      params.push(status);
    }
    
    query += ' GROUP BY t.id ORDER BY t.created_at DESC';
    
    const tournaments = await db.all(query, params);
    return tournaments;
  } catch (error) {
    console.error('Error getting tournaments from DB:', error);
    throw error;
  }
}

/**
 * Obtiene información de un torneo específico desde la base de datos
 * @param {Object} db - Instancia de la base de datos
 * @param {number} tournamentId - ID del torneo
 * @returns {Promise<Object|null>} - Información del torneo o null si no existe
 */
export async function getTournamentFromDB(db, tournamentId) {
  try {
    const tournament = await db.get(`
      SELECT * FROM tournaments WHERE id = ?
    `, [tournamentId]);

    if (!tournament) {
      return null;
    }

    // Obtener partidas del torneo
    const games = await db.all(`
      SELECT 
        g.*,
        u1.username as player1_name,
        u2.username as player2_name
      FROM games g
      JOIN users u1 ON g.player1_id = u1.id
      JOIN users u2 ON g.player2_id = u2.id
      WHERE g.tournament_id = ?
      ORDER BY g.created_at DESC
    `, [tournamentId]);

    return {
      ...tournament,
      games
    };
  } catch (error) {
    console.error('Error getting tournament from DB:', error);
    throw error;
  }
}

/**
 * Actualiza el estado online de un usuario
 * @param {Object} db - Instancia de la base de datos
 * @param {number} userId - ID del usuario
 * @param {boolean} isOnline - Estado online (true/false)
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
export async function updateUserOnlineStatus(db, userId, isOnline) {
  try {
    const result = await db.run(`
      UPDATE users 
      SET status = ?, last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [isOnline ? 1 : 0, userId]);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating user online status:', error);
    throw error;
  }
}

/**
 * Obtiene lista de usuarios online
 * @param {Object} db - Instancia de la base de datos
 * @returns {Promise<Array>} - Lista de usuarios online
 */
export async function getOnlineUsers(db) {
  try {
    const onlineUsers = await db.all(`
      SELECT 
        id,
        username,
        avatar,
        last_login
      FROM users 
      WHERE status = 1
      ORDER BY last_login DESC
    `);
    
    return onlineUsers;
  } catch (error) {
    console.error('Error getting online users:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas generales del sistema
 * @param {Object} db - Instancia de la base de datos
 * @returns {Promise<Object>} - Estadísticas del sistema
 */
export async function getSystemStats(db) {
  try {
    // Total usuarios
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    
    // Usuarios online
    const onlineUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE status = 1');
    
    // Total partidas
    const totalGames = await db.get('SELECT COUNT(*) as count FROM games');
    
    // Partidas completadas
    const completedGames = await db.get('SELECT COUNT(*) as count FROM games WHERE status = "finished"');
    
    // Total torneos
    const totalTournaments = await db.get('SELECT COUNT(*) as count FROM tournaments');
    
    // Promedio de win rate
    const avgWinRate = await db.get(`
      SELECT AVG(
        CASE 
          WHEN (wins + losses) > 0 
          THEN (wins * 100.0) / (wins + losses)
          ELSE 0 
        END
      ) as avg_rate FROM users
    `);
    
    return {
      totalUsers: totalUsers.count,
      onlineUsers: onlineUsers.count,
      totalGames: totalGames.count,
      completedGames: completedGames.count,
      totalTournaments: totalTournaments.count,
      avgWinRate: avgWinRate.avg_rate ? parseFloat(avgWinRate.avg_rate.toFixed(1)) : 0
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    throw error;
  }
}
