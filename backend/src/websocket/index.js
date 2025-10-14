// WebSocket Main Entry Point - Punto de entrada principal
import { ServerGameSocket } from "../game/Game/ServerGameSocket.js";

// Mapa de salas activas
const activeRooms = new Map();

// --- Main WebSocket registration ---
export default async function registerWebsocket(fastify) {
  try {
    fastify.get("/gamews", { websocket: true }, (connection, req) => {
      const { room, user } = req.query;

      if (!room) {
        connection.socket.send(JSON.stringify({ error: "Missing room parameter" }));
        connection.socket.close();
        return;
      }

      console.log(`🎮 Nueva conexión: sala=${room}, user=${user}`);

      let roomSocket = activeRooms.get(room);

      // Si la sala no existe, crear el ServerGameSocket
      if (!roomSocket) {
        console.log(`🆕 Creando nueva sala: ${room}`);
        roomSocket = new ServerGameSocket(room);
        activeRooms.set(room, roomSocket);
      } else {
        console.log(`✅ Reutilizando sala existente: ${room}`);
      }

      // Agregar al jugador a la sala
      roomSocket.AddPeople(user, connection);

      // Manejar cierre del socket
      connection.on("close", () => {
        // console.log(`❌ ${user ?? "Anónimo"} desconectado de la sala ${room}`);

        // Si la sala quedó vacía, eliminarla
        if (roomSocket.people.size === 0) {
          console.log(`🧹 Sala ${room} vacía. Eliminando instancia de ServerGameSocket.`);
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