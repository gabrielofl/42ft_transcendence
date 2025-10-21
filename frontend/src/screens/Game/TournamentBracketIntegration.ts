// TournamentBracketIntegration - Integración del BracketViewer con el sistema existente
// Muestra cómo usar el BracketViewer en las pantallas de torneo

import { BracketViewer } from './BracketViewer';
import { ClientTournamentSocket } from '../../services/tournament-socket';

/**
 * Integración del BracketViewer con el sistema de torneos existente
 * Este archivo muestra cómo usar el BracketViewer en las pantallas de torneo
 */
export class TournamentBracketIntegration {
  private bracketViewer: BracketViewer | null = null;
  private tournamentSocket: ClientTournamentSocket;

  constructor() {
    this.tournamentSocket = ClientTournamentSocket.GetInstance();
  }

  /**
   * Inicializa el bracket viewer en un contenedor específico
   * @param containerId - ID del elemento HTML donde mostrar el bracket
   */
  public initializeBracketViewer(containerId: string) {
    // Crear el bracket viewer
    this.bracketViewer = new BracketViewer(containerId);
    
    console.log('🏆 BracketViewer inicializado en:', containerId);
  }

  /**
   * Conecta al torneo y configura el bracket viewer
   * @param tournamentId - ID del torneo
   * @param userId - ID del usuario
   * @param username - Nombre del usuario
   */
  public connectToTournament(tournamentId: number, userId: number, username: string) {
    // Conectar al WebSocket del torneo
    this.tournamentSocket.ConnectToTournament(tournamentId, userId, username);
    
    console.log(`🔗 Conectado al torneo ${tournamentId} como ${username}`);
  }

  /**
   * Desconecta del torneo y limpia recursos
   */
  public disconnect() {
    if (this.bracketViewer) {
      this.bracketViewer.dispose();
      this.bracketViewer = null;
    }
    
    this.tournamentSocket.Disconnect();
    console.log('🔌 Desconectado del torneo');
  }

  /**
   * Obtiene el tournament socket para operaciones adicionales
   */
  public getTournamentSocket(): ClientTournamentSocket {
    return this.tournamentSocket;
  }
}

/**
 * Función helper para integrar el bracket viewer en una pantalla existente
 * @param containerId - ID del contenedor donde mostrar el bracket
 * @param tournamentId - ID del torneo
 * @param userId - ID del usuario
 * @param username - Nombre del usuario
 * @returns Instancia de la integración
 */
export function setupTournamentBracket(
  containerId: string, 
  tournamentId: number, 
  userId: number, 
  username: string
): TournamentBracketIntegration {
  const integration = new TournamentBracketIntegration();
  
  // Inicializar el bracket viewer
  integration.initializeBracketViewer(containerId);
  
  // Conectar al torneo
  integration.connectToTournament(tournamentId, userId, username);
  
  return integration;
}

/**
 * Ejemplo de uso en una pantalla de torneo:
 * 
 * ```typescript
 * // En tu pantalla de torneo (ej: tournament_waiting_room.ts)
 * import { setupTournamentBracket } from './Game/TournamentBracketIntegration';
 * 
 * // Crear un contenedor para el bracket
 * const bracketContainer = document.createElement('div');
 * bracketContainer.id = 'tournament-bracket';
 * document.body.appendChild(bracketContainer);
 * 
 * // Configurar el bracket viewer
 * const bracketIntegration = setupTournamentBracket(
 *   'tournament-bracket',
 *   tournamentId,
 *   userId,
 *   username
 * );
 * 
 * // Para desconectar cuando sea necesario
 * bracketIntegration.disconnect();
 * ```
 */
