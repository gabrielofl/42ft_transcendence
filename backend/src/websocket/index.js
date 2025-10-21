// WebSocket Main Entry Point - Punto de entrada principal
import { ServerGameSocket } from "../game/Game/ServerGameSocket.js";

// Mapa de salas activas
const activeRooms = new Map();

// Helper: Parsear roomId de torneo
function parseTournamentRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') return null;
  const match = roomId.match(/^tournament-(\d+)-match-(\d+)$/);
  if (match) {
    return {
      tournamentId: parseInt(match[1]),
      matchId: parseInt(match[2])
    };
  }
  return null;
}

// --- Main WebSocket registration ---
export default async function registerWebsocket(fastify) {
  try {
    fastify.get("/gamews", { websocket: true }, async (connection, req) => {
      const { room, user } = req.query;

      if (!room) {
        connection.socket.send(JSON.stringify({ error: "Missing room parameter" }));
        connection.socket.close();
        return;
      }


      let roomSocket = activeRooms.get(room);

      // Si la sala no existe, crear el ServerGameSocket
      if (!roomSocket) {
        
        // Verificar si es una sala de torneo y obtener configuración
        const tournamentInfo = parseTournamentRoomId(room);
        if (tournamentInfo) {
          // Obtener configuración del torneo de la DB
          const tournament = await fastify.db.get(
            `SELECT map_key, powerup_amount, enabled_powerups, wind_amount, match_time_limit 
             FROM tournaments WHERE id = ?`,
            [tournamentInfo.tournamentId]
          );
          
          if (tournament) {
            
            // Crear ServerGameSocket con configuración del torneo
            roomSocket = new ServerGameSocket(room, {
              mapKey: tournament.map_key,
              powerupAmount: tournament.powerup_amount,
              enabledPowerups: JSON.parse(tournament.enabled_powerups || '[]'),
              windAmount: tournament.wind_amount,
              matchTimeLimit: tournament.match_time_limit
            });
          } else {
            roomSocket = new ServerGameSocket(room);
          }
        } else {
          roomSocket = new ServerGameSocket(room);
        }
        
        activeRooms.set(room, roomSocket);
      }

      // Agregar al jugador a la sala
      roomSocket.AddPeople(user, connection);

      // Manejar cierre del socket
      connection.on("close", () => {
        // console.log(`❌ ${user ?? "Anónimo"} desconectado de la sala ${room}`);

        // Si la sala quedó vacía, eliminarla
        if (roomSocket.people.size === 0) {
          activeRooms.delete(room);
          try {
            roomSocket.Dispose?.();
          } catch {}
        }
      });
    });

    console.log('✅ WebSocket /gamews registrado');
  } catch (error) {
    console.error('Error registering /gamews:', error);
    throw error;
  }
} 