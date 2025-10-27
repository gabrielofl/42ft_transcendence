// BracketViewer - Componente para mostrar brackets de torneos en tiempo real
// Reutiliza la lógica de Tournament.ts pero adaptado para los nuevos eventos del backend

import { MessageBroker } from "@shared/utils/MessageBroker";

// Tipos para el estado del bracket
interface Player {
  userId: number;
  username: string;
}

interface Match {
  matchId: number;
  roomId: string;
  player1: Player | null;
  player2: Player | null;
  winner: Player | null;
  status: 'pending' | 'in_progress' | 'completed';
  score1?: number;
  score2?: number;
}

interface BracketRound {
  name: string;
  matches: Match[];
}

interface BracketState {
  tournamentId?: number;
  currentRound: number;
  rounds: BracketRound[];
  status: 'waiting' | 'in_progress' | 'finished';
  winner: Player | null;
}

export class BracketViewer {
  public container: HTMLElement | null = null;
  private bracketState: BracketState = {
    currentRound: 0,
    rounds: [],
    status: 'waiting',
    winner: null
  };
  private unsubscribeFunctions: Array<() => void> = [];
  public messageBroker = new MessageBroker();

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id '${containerId}' not found`);
      return;
    }

    this.setupEventListeners();
    this.render();
  }

  /**
   * Configura los listeners para eventos de bracket
   */
  private setupEventListeners() {
    // Limpiar listeners anteriores
    this.unsubscribeFunctions.forEach(fn => fn());
    this.unsubscribeFunctions = [];

    // Listener para bracket generado inicialmente
    const onBracketGenerated = (data: any) => {
      this.handleBracketGenerated(data);
    };
    this.messageBroker.Subscribe('BracketGenerated', onBracketGenerated);
    this.unsubscribeFunctions.push(() => this.messageBroker.Unsubscribe('BracketGenerated', onBracketGenerated));

    // Listener para bracket completo (todas las rondas)
    const onBracketFullState = (data: any) => {
      this.handleBracketFullState(data);
    };
    this.messageBroker.Subscribe('BracketFullState', onBracketFullState);
    this.unsubscribeFunctions.push(() => this.messageBroker.Unsubscribe('BracketFullState', onBracketFullState));

    // Listener para bracket actualizado desde el backend
    const onBracketUpdated = (data: any) => {
      this.handleBracketUpdated(data);
    };
    this.messageBroker.Subscribe('BracketUpdated', onBracketUpdated);
    this.unsubscribeFunctions.push(() => this.messageBroker.Unsubscribe('BracketUpdated', onBracketUpdated));

    // Listener para match completado
    const onMatchCompleted = (data: any) => {
      this.handleMatchCompleted(data);
    };
    this.messageBroker.Subscribe('BracketMatchCompleted', onMatchCompleted);
    this.unsubscribeFunctions.push(() => this.messageBroker.Unsubscribe('BracketMatchCompleted', onMatchCompleted));

    // Listener para ronda avanzada
    const onRoundAdvanced = (data: any) => {
      this.handleRoundAdvanced(data);
    };
    this.messageBroker.Subscribe('BracketRoundAdvanced', onRoundAdvanced);
    this.unsubscribeFunctions.push(() => this.messageBroker.Unsubscribe('BracketRoundAdvanced', onRoundAdvanced));

    // Listener para torneo terminado
    const onTournamentFinished = (data: any) => {
      this.handleTournamentFinished(data);
    };
    this.messageBroker.Subscribe('BracketTournamentFinished', onTournamentFinished);
    this.unsubscribeFunctions.push(() => this.messageBroker.Unsubscribe('BracketTournamentFinished', onTournamentFinished));
  }

  /**
   * Maneja cuando se genera el bracket inicial
   */
  private handleBracketGenerated(data: any) {
    const { bracket } = data;
    
    // Convertir formato del backend al formato interno
    this.bracketState = {
      currentRound: bracket.currentRound || 0,
      rounds: [{
        name: bracket.roundName || 'Quarterfinals',
        matches: bracket.matches.map((match: any) => ({
          matchId: match.matchId,
          roomId: match.roomId,
          player1: match.player1,
          player2: match.player2,
          winner: null,
          status: 'pending' as const,
          score1: match.score1,
          score2: match.score2
        }))
      }],
      status: 'in_progress',
      winner: null
    };

    this.render();
  }

  /**
   * Maneja cuando se recibe el estado completo del bracket (todas las rondas)
   */
  private handleBracketFullState(data: any) {
    this.bracketState = {
      tournamentId: data.tournamentId,
      currentRound: data.currentRound,
      rounds: data.rounds,
      status: data.status || 'in_progress',
      winner: null
    };

    this.render();
  }

  /**
   * Maneja cuando se actualiza el bracket desde el backend
   */
  private handleBracketUpdated(data: any) {
    const bracket = data.bracket;
    
    // Convertir el bracket del backend al formato interno
    this.bracketState = {
      tournamentId: data.tournamentId,
      currentRound: bracket.currentRound || 0,
      rounds: bracket.rounds.map((round: any) => ({
        name: round.name,
        matches: round.matches.map((match: any) => ({
          matchId: match.matchId,
          roomId: match.roomId || `tournament-${data.tournamentId}-match-${match.matchId}`,
          player1: match.player1,
          player2: match.player2,
          winner: match.winner || null,
          status: match.status || 'pending',
          score1: match.score1,
          score2: match.score2
        }))
      })),
      status: bracket.status || 'in_progress',
      winner: bracket.winner || null
    };

    this.render();
  }

  /**
   * Maneja cuando se completa un match
   */
  private handleMatchCompleted(data: any) {
    const { matchId, winner } = data;
    
    // Encontrar y actualizar el match
    for (const round of this.bracketState.rounds) {
      const match = round.matches.find(m => m.matchId === matchId);
      if (match) {
        match.winner = winner;
        match.status = 'completed';
        break;
      }
    }

    this.render();
  }

  /**
   * Maneja cuando avanza una ronda
   */
  private handleRoundAdvanced(data: any) {
    // Este método se mantiene por compatibilidad pero BracketUpdated maneja las actualizaciones
    // No hacer nada - BracketUpdated ya actualiza todo el bracket
  }

  /**
   * Maneja cuando termina el torneo
   */
  private handleTournamentFinished(data: any) {
    const { winner } = data;
    
    
    this.bracketState.status = 'finished';
    this.bracketState.winner = winner;


    // No cambiar el render - mantener el bracket visible con el resultado final
    // Solo actualizar el estado para que los matches muestren los ganadores
    this.render();
  }

  /**
   * Renderiza el bracket visual
   */
  private render() {
    if (!this.container) return;

    if (this.bracketState.status === 'waiting') {
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-full text-white">
          <div class="text-center">
            <div class="text-lg mb-2">⏳ Esperando bracket...</div>
            <div class="text-sm text-gray-400">El bracket se generará cuando todos estén listos</div>
          </div>
        </div>
      `;
      return;
    }

    if (this.bracketState.status === 'finished') {
      // Mostrar el bracket con el resultado final y un mensaje sutil
      this.container.innerHTML = `
        <div class="w-full h-full flex flex-col">
          <div class="text-center mb-4">
            <h2 class="text-[--primary-color] text-xl font-bold">Tournament Bracket</h2>
            <div class="text-sm text-gray-400">Final Results</div>
            <div class="text-lg text-yellow-400 font-bold mt-2">
              🏆 Winner: ${this.bracketState.winner?.username}
            </div>
          </div>
          <div class="flex-1 overflow-x-auto">
            <div class="flex items-center justify-center h-full gap-8 p-4">
              ${this.renderBracketRounds()}
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Renderizar bracket en progreso
    this.container.innerHTML = `
      <div class="w-full h-full flex flex-col">
        <div class="text-center mb-4">
          <h2 class="text-[--primary-color] text-xl font-bold">Tournament Bracket</h2>
          <div class="text-sm text-gray-400">Round ${this.bracketState.currentRound + 1}</div>
        </div>
        <div class="flex-1 overflow-x-auto">
          <div class="flex items-center justify-center h-full gap-8 p-4">
            ${this.renderBracketRounds()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza las rondas del bracket
   */
  private renderBracketRounds(): string {
    return this.bracketState.rounds.map((round, roundIndex) => `
      <div class="flex flex-col items-center space-y-8 min-w-[200px]">
        <div class="text-center mb-4">
          <h3 class="text-white font-bold text-lg">${round.name}</h3>
          <div class="text-sm text-gray-400">Round ${roundIndex + 1}</div>
        </div>
        ${round.matches.map(match => this.renderMatch(match, roundIndex)).join('')}
      </div>
    `).join('');
  }

  /**
   * Renderiza un match individual
   */
  private renderMatch(match: Match, roundIndex: number): string {
    const getPlayerClass = (player: Player | null, isWinner: boolean) => {
      if (!player) return 'bg-gray-700 text-gray-500';
      if (isWinner) return 'bg-green-600 text-white';
      if (match.status === 'completed') return 'bg-red-600 text-white';
      if (match.status === 'in_progress') return 'bg-blue-600 text-white';
      return 'bg-gray-600 text-white';
    };

    const isWinner1 = match.winner?.userId === match.player1?.userId;
    const isWinner2 = match.winner?.userId === match.player2?.userId;

    const getStatusIcon = () => {
      switch (match.status) {
        case 'in_progress': return '🔄';
        case 'completed': return '✅';
        default: return '⏳';
      }
    };

    return `
      <div class="relative flex flex-col items-center space-y-2 w-full">
        <div class="text-xs text-gray-400 mb-1">Match ${match.matchId}</div>
        
        <div class="flex items-center gap-2 w-full">
          <div class="text-xs">${getStatusIcon()}</div>
          <div class="flex-1">
            <div class="text-sm text-center px-3 py-2 rounded ${getPlayerClass(match.player1, isWinner1)}">
              ${match.player1?.username || 'TBD'}${match.score1 !== undefined && match.score1 !== null ? ` (${match.score1})` : ''}
            </div>
            <div class="text-sm text-center px-3 py-2 rounded ${getPlayerClass(match.player2, isWinner2)}">
              ${match.player2?.username || 'TBD'}${match.score2 !== undefined && match.score2 !== null ? ` (${match.score2})` : ''}
            </div>
          </div>
        </div>

        ${roundIndex < this.bracketState.rounds.length - 1 ? `
          <div class="absolute right-[-20px] top-1/2 transform -translate-y-1/2">
            <svg width="20" height="40" viewBox="0 0 20 40">
              <path d="M0 20 L20 20 L20 10" stroke="white" stroke-width="2" fill="none"/>
              <path d="M0 20 L20 20 L20 30" stroke="white" stroke-width="2" fill="none"/>
            </svg>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Obtiene el estado actual del bracket
   */
  public getStatus(): string {
    return this.bracketState.status;
  }

  /**
   * Limpia recursos y listeners
   */
  public dispose() {
    this.unsubscribeFunctions.forEach(fn => fn());
    this.unsubscribeFunctions = [];
    this.container = null;
  }
}

