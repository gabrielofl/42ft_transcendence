// Tournament WebSocket Client - Cliente para torneos en tiempo real
import { makeWsUrl } from "../screens/config";
import { MessageBroker } from "@shared/utils/MessageBroker";

// Tipos para los nuevos eventos de bracket
export interface MatchCompletedEvent {
  type: 'MatchCompleted';
  tournamentId: number;
  matchId: number;
  winner: { userId: number; username: string };
}

export interface RoundAdvancedEvent {
  type: 'RoundAdvanced';
  tournamentId: number;
  roundNumber: number;
  roundName: string;
  matches: Array<{
    matchId: number;
    roomId: string;
    player1: { userId: number; username: string };
    player2: { userId: number; username: string };
  }>;
}

export interface TournamentFinishedEvent {
  type: 'TournamentFinished';
  tournamentId: number;
  winner: { userId: number; username: string };
}

export interface TournamentForfeitEvent {
  type: 'TournamentForfeitWin';
  tournamentId: number;
  matchId: number;
  winner: { userId: number; username: string };
  loser: { userId: number; username: string };
}

export class ClientTournamentSocket {
  private static instance: ClientTournamentSocket;
  private ws: WebSocket | null = null;
  public UIBroker = new MessageBroker();
  private tournamentId: number | null = null;

  static GetInstance(): ClientTournamentSocket {
    if (!this.instance) {
      this.instance = new ClientTournamentSocket();
    }
    return this.instance;
  }

  ConnectToTournament(tournamentId: number, userId: number, username: string) {
    // Si ya hay una conexión, desconectar primero
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.tournamentId = tournamentId;
    
    // Conectar al WebSocket con tournament ID en query params
    const wsUrl = makeWsUrl(`/tournamentws?tournament=${encodeURIComponent(tournamentId)}`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Conexión establecida
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Manejar eventos específicos de bracket
        this.handleBracketEvent(msg);
        
        // Publicar evento para otros componentes
        this.UIBroker.Publish(msg.type, msg);
      } catch (e) {
        console.error('Failed to parse tournament message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('Tournament WebSocket error:', error);
    };

    this.ws.onclose = () => {
      // Conexión cerrada
    };
  }

  ToggleReady() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'ToggleReady'
    }));
  }

  InviteAI() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'InviteAI'
    }));
  }

  Send(message: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  Disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Limpiar TODAS las suscripciones para evitar duplicados en próxima conexión
    this.UIBroker.ClearAll();
    
    this.tournamentId = null;
  }

  /**
   * Maneja eventos específicos de bracket y emite eventos internos
   */
  private handleBracketEvent(msg: any) {
    switch (msg.type) {
      case 'MatchCompleted':
        this.handleMatchCompleted(msg as MatchCompletedEvent);
        break;
      case 'RoundAdvanced':
        this.handleRoundAdvanced(msg as RoundAdvancedEvent);
        break;
      case 'TournamentFinished':
        this.handleTournamentFinished(msg as TournamentFinishedEvent);
        break;
      case 'BracketGenerated':
        this.handleBracketGenerated(msg);
        break;
      case 'BracketUpdated':
        this.handleBracketUpdated(msg);
        break;
      case 'TournamentForfeitWin':
        this.handleTournamentForfeit(msg as TournamentForfeitEvent);
        break;
    }
  }

  /**
   * Maneja cuando se completa un match individual
   */
  private handleMatchCompleted(event: MatchCompletedEvent) {
    this.UIBroker.Publish('BracketMatchCompleted', {
      matchId: event.matchId,
      winner: event.winner,
      tournamentId: event.tournamentId
    });
  }

  /**
   * Maneja cuando avanza una ronda (cuartos → semifinales → final)
   */
  private handleRoundAdvanced(event: RoundAdvancedEvent) {
    this.UIBroker.Publish('BracketRoundAdvanced', {
      roundNumber: event.roundNumber,
      roundName: event.roundName,
      matches: event.matches,
      tournamentId: event.tournamentId
    });
  }

  /**
   * Maneja cuando el torneo termina
   */
  private handleTournamentFinished(event: TournamentFinishedEvent) {
    this.UIBroker.Publish('BracketTournamentFinished', {
      winner: event.winner,
      tournamentId: event.tournamentId
    });
  }

  private handleTournamentForfeit(event: TournamentForfeitEvent) {
    this.UIBroker.Publish('TournamentForfeitWin', {
      tournamentId: event.tournamentId,
      matchId: event.matchId,
      winner: event.winner,
      loser: event.loser
    });
  }

  /**
   * Maneja cuando se genera el bracket inicial
   */
  private handleBracketGenerated(msg: any) {
    this.UIBroker.Publish('BracketGenerated', {
      bracket: msg.bracket,
      tournamentId: msg.tournamentId
    });
  }

  /**
   * Maneja cuando se actualiza el bracket completo
   */
  private handleBracketUpdated(msg: any) {
    this.UIBroker.Publish('BracketUpdated', {
      bracket: msg.bracket,
      tournamentId: msg.tournamentId
    });
  }
}

