// WebSocket Main Entry Point - Punto de entrada principal
import { handleGameConnection } from "./game-manager.js";

// Almacén global para matches pendientes de torneo
global.pendingTournamentMatches = global.pendingTournamentMatches || new Map();

// Función para iniciar un match de torneo
export async function startTournamentMatch(roomId) {
  if (!global.pendingTournamentMatches.has(roomId)) {
    return false;
  }
  
  const matchData = global.pendingTournamentMatches.get(roomId);
  const { gameSocket, players, config } = matchData;
  
  // Crear jugadores (AI o reales)
  const { AIPlayer } = await import('../game/Player/AIPlayer.js');
  const { ServerSocketPlayer } = await import('../game/Player/ServerSocketPlayer.js');
  const MAPS = await import('../game/Maps.js');
  
  const gamePlayers = players.map(p => {
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

  // Configurar mapa
  gameSocket.game.Map = MAPS[config.mapKey] || MAPS.MultiplayerMap;
  
  // Iniciar el juego con CreateGame
  gameSocket.game.CreateGame(gamePlayers);
  
  // Limpiar de pendientes
  global.pendingTournamentMatches.delete(roomId);
  return true;
}

// --- Main WebSocket registration ---
export default async function registerWebsocket(fastify) {
  // Registrar el handler de WebSocket para partidas
  fastify.get("/gamews", { websocket: true }, async (connection, req) => {
    handleGameConnection(connection, req);
  });
} 