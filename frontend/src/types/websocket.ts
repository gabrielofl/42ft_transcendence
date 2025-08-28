// Interfaces para WebSocket refactorizado

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
}

export interface GameEvent {
  type: string;
  payload: any;
  timestamp: number;
}

export interface WebSocketMessage {
  event: string;
  [key: string]: any;
}

export interface MessageHandler {
  (payload: any): void;
}

export interface WebSocketStatus {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

// Tipos específicos de mensajes del juego
export interface RoomInfoPayload {
  roomId: string;
  slot: 'player1' | 'player2';
  players: {
    player1?: { userId: string; name: string; connected: boolean };
    player2?: { userId: string; name: string; connected: boolean };
  };
  status: string;
}

export interface GameStatePayload {
  ball: { x: number; y: number; vx: number; vy: number; size: number };
  players: {
    player1: { y: number; score: number };
    player2: { y: number; score: number };
  };
}

export interface CountdownPayload {
  seconds: number;
  roomId: string;
}

export interface PlayerScoredPayload {
  player: 'player1' | 'player2';
  score: number;
  scores: { player1: number; player2: number };
  roomId: string;
}

export interface GameEndedPayload {
  roomId: string;
  winner: { userId: string; name: string; score: number };
  loser: { userId: string; name: string; score: number };
  reason: string;
}
