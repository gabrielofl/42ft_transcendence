/**
 * Obtiene los datos de una sala y sus jugadores desde la base de datos.
 * @param {import('fastify').FastifyInstance} fastify - Instancia de Fastify para acceder a la DB.
 * @param {string} code - El código de la sala.
 * @returns {Promise<{room: object, players: object[]}|null>}
 */
export async function getRoomByCode(fastify, code) {
  const room = await fastify.db.get(`SELECT * FROM rooms WHERE code = ?`, [code]);
  if (!room) return null;
  const players = await fastify.db.all(
    `SELECT user_id AS userId, username, is_host AS isHost, ready
       FROM room_players WHERE room_id = ?
       ORDER BY joined_at ASC`, [room.id]
  );
  return { room, players };
}
