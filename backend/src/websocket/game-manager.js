// src/websocket/game-manager.js
import { ServerGameSocket } from '../game/Game/ServerGameSocket.js';
import { AIPlayer } from '../game/Player/AIPlayer.js';
import { ServerSocketPlayer } from '../game/Player/ServerSocketPlayer.js';
import * as MAPS from '../game/Maps.js';

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
 * @param {object} config - La configuración de la sala, incluyendo el mapa.
 */
export async function startGame(roomCode, combined, config) {
  // Prevenimos la condición de carrera: si ya está activa o se está creando, no hacemos nada.
  if (isGameActive(roomCode) || startingGames.has(roomCode)) {
    console.warn(`[GameManager] La partida para la sala ${roomCode} ya existe o se está iniciando. Se omite la creación.`);
    return;
  }

  try {
    startingGames.add(roomCode); // "Bloqueamos" la creación para este roomCode.

    console.log(`[GameManager] Creando instancia de juego para la sala ${roomCode}`);
    const gameSocket = new ServerGameSocket(roomCode, config);
    addGame(roomCode, gameSocket); // La registramos en el gestor de partidas activas.

    const players = combined.map(p => {
      if (p.userId < 0) { // Jugador IA
        let player = new AIPlayer(gameSocket.game, p.username);
        player.id = p.userId;
        return player;
      } else { // Jugador real
        let player = new ServerSocketPlayer(gameSocket.game, p.username);
        player.id = p.userId;
        return player;
      }
    });

    gameSocket.game.Map = MAPS[config.mapKey] || MAPS.MultiplayerMap;
    console.log("Game Map");
    // console.log(gameSocket.game.Map);
    gameSocket.game.maxPowerUps = config.powerUpAmount;
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
  const roomCode = (url.searchParams.get('room') || '').trim(); // No convertir a mayúsculas para soportar torneos
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
