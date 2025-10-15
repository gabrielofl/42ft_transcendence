// src/websocket/game-manager.js
import { ServerGameSocket } from '../game/Game/ServerGameSocket.js';
import { AIPlayer } from '../game/Player/AIPlayer.js';
import { ServerSocketPlayer } from '../game/Player/ServerSocketPlayer.js';

/**
 * @description Mapa para almacenar las instancias de juego activas.
 * La clave es el `roomCode` y el valor es la instancia de `ServerGameSocket`.
 * @type {Map<string, import('../game/Game/ServerGameSocket.js').ServerGameSocket>}
 */
const activeGames = new Map();

/**
 * @description Set para rastrear las salas que están en proceso de creación para evitar condiciones de carrera.
 * @type {Set<string>}
 */
const startingGames = new Set();

/**
 * Agrega una nueva instancia de juego al gestor.
 * @param {string} roomCode - El código de la sala.
 * @param {import('../game/Game/ServerGameSocket.js').ServerGameSocket} gameSocket - La instancia del juego.
 */
export function addGame(roomCode, gameSocket) {
  console.log(`[GameManager] Registrando partida para la sala: ${roomCode}`);
  activeGames.set(roomCode, gameSocket);
}

/**
 * Inicia una nueva partida, la registra y crea los jugadores.
 * @param {string} roomCode - El código de la sala.
 * @param {Array<{userId: number, username: string}>} combined - La lista de jugadores.
 */
export async function startGame(roomCode, combined) {
  // Prevenimos la condición de carrera: si ya está activa o se está creando, no hacemos nada.
  if (isGameActive(roomCode) || startingGames.has(roomCode)) {
    console.warn(`[GameManager] La partida para la sala ${roomCode} ya existe o se está iniciando. Se omite la creación.`);
    return;
  }

  try {
    startingGames.add(roomCode); // "Bloqueamos" la creación para este roomCode.

    console.log(`[GameManager] Creando instancia de juego para la sala ${roomCode}`);
    const gameSocket = new ServerGameSocket(roomCode);
    addGame(roomCode, gameSocket); // La registramos en el gestor de partidas activas.

    const players = combined.map(p => {
      if (p.userId < 0) { // Jugador IA
        return new AIPlayer(gameSocket.game, p.username);
      } else { // Jugador real
        return new ServerSocketPlayer(gameSocket.game, p.username);
      }
    });

    gameSocket.game.CreateGame(players);
  } finally {
    startingGames.delete(roomCode); // "Liberamos" el bloqueo, haya funcionado o no.
  }
}

/**
 * Obtiene una instancia de juego activa por su código de sala.
 * @param {string} roomCode - El código de la sala.
 * @returns {import('../game/Game/ServerGameSocket.js').ServerGameSocket | undefined}
 */
export function getGame(roomCode) {
  return activeGames.get(roomCode);
}

/**
 * Elimina una instancia de juego del gestor.
 * @param {string} roomCode - El código de la sala.
 */
export function removeGame(roomCode) {
  const game = activeGames.get(roomCode);
  if (game) {
    console.log(`[GameManager] Eliminando partida de la sala: ${roomCode}`);
    game.Dispose();
    activeGames.delete(roomCode);
  }
}

/**
 * Verifica si una partida está activa.
 * @param {string} roomCode - El código de la sala.
 * @returns {boolean}
 */
export function isGameActive(roomCode) {
  return activeGames.has(roomCode);
}

/**
 * Maneja una nueva conexión WebSocket para una partida activa.
 * @param {import('@fastify/websocket').SocketStream} connection - La conexión del socket.
 * @param {import('fastify').FastifyRequest} req - La solicitud de conexión.
 */
export function handleGameConnection(connection, req) {
  console.log("handleGameConnection");
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomCode = (url.searchParams.get('room') || '').toUpperCase().trim();
  const user = url.searchParams.get('user') || 'anonymous';

  if (!roomCode) {
    try { connection.socket.send(JSON.stringify({ error: "Missing room parameter" })); } catch {}
    try { connection.socket.close(1008, 'No room code provided'); } catch {}
    return;
  }

  console.log(`[GameManager] Conexión entrante para la sala ${roomCode} por usuario ${user}`);

  const gameSocket = getGame(roomCode);

  if (!gameSocket) {
    console.warn(`[GameManager] Partida no encontrada para la sala ${roomCode}. Rechazando conexión.`);
    try { connection.socket.send(JSON.stringify({ error: `Game room ${roomCode} not found or not started yet.` })); } catch {}
    try { connection.socket.close(1011, 'Game not found'); } catch {}
    return;
  }

  console.log(`[GameManager] Jugador ${user} uniéndose a la partida en la sala ${roomCode}.`);
  gameSocket.AddPeople(user, connection);

  connection.on("close", () => {
    if (gameSocket.people.size === 0) {
      removeGame(roomCode);
    }
  });
}

/**const { room, user } = req.query;

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
     */