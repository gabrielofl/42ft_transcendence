// Tournament WebSocket Client - Cliente para torneos en tiempo real

import { MessageBroker } from "@shared/utils/MessageBroker";

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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = 'localhost:443';
    const wsUrl = `${protocol}//${host}/tournamentws?tournament=${tournamentId}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Conexión establecida
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
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

  Disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Limpiar TODAS las suscripciones para evitar duplicados en próxima conexión
    this.UIBroker.ClearAll();
    
    this.tournamentId = null;
  }
}

