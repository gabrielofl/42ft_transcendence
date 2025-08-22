// Estructura básica para torneos 1v1 de hasta 8 jugadores

const MAX_PLAYERS = 8;
const MATCH_TIME_LIMIT = 3 * 60 * 1000; // 3 minutos en milisegundos
const TOURNAMENT_STATUS = {
  WAITING: 'waiting', // Esperando jugadores
  READY: 'ready',     // Listo para empezar
  IN_PROGRESS: 'in_progress',
  FINISHED: 'finished',
};

// Mapa de torneos activos: id -> torneo
const tournaments = new Map();
let nextTournamentId = 1;

function createTournament(creatorUserId) {
  const id = `tournament-${nextTournamentId++}`;
  const tournament = {
    id,
    creator: creatorUserId,
    players: [creatorUserId], // El creador se une automáticamente
    disconnectedPlayers: [], // Jugadores desconectados antes del torneo
    status: TOURNAMENT_STATUS.WAITING,
    bracket: [], // Se llenará al iniciar
    currentRound: 0,
    matches: [], // Partidas activas (roomId, player1, player2, etc.)
    winner: null,
    startTime: null,
    matchTimeouts: new Map(), // Timeouts para partidas de 3 min
  };
  tournaments.set(id, tournament);
  return tournament;
}

function joinTournament(tournamentId, userId) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return { error: 'Torneo no encontrado' };
  if (tournament.players.length >= MAX_PLAYERS) return { error: 'Torneo lleno' };
  if (tournament.players.includes(userId)) return { error: 'Ya estás inscrito' };
  if (tournament.status !== TOURNAMENT_STATUS.WAITING) return { error: 'Torneo ya iniciado' };
  
  // Si hay jugadores desconectados, reemplazar uno
  if (tournament.disconnectedPlayers.length > 0) {
    const disconnectedPlayer = tournament.disconnectedPlayers.shift();
    const index = tournament.players.indexOf(disconnectedPlayer);
    if (index !== -1) {
      tournament.players[index] = userId;
    }
  } else {
    tournament.players.push(userId);
  }
  
  if (tournament.players.length === MAX_PLAYERS) {
    tournament.status = TOURNAMENT_STATUS.READY;
  }
  return { success: true, tournament };
}

function handlePlayerDisconnect(tournamentId, userId) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;
  
  if (tournament.status === TOURNAMENT_STATUS.WAITING) {
    // Antes del torneo: liberar hueco
    const index = tournament.players.indexOf(userId);
    if (index !== -1) {
      tournament.players.splice(index, 1);
      tournament.disconnectedPlayers.push(userId);
    }
  } else if (tournament.status === TOURNAMENT_STATUS.IN_PROGRESS) {
    // Durante el torneo: pausar partida y esperar 3 min
    const match = findPlayerMatch(tournament, userId);
    if (match) {
      match.disconnectedPlayer = userId;
      match.disconnectTime = Date.now();
      // El timeout de 3 min se maneja en el websocket
    }
  }
}

function findPlayerMatch(tournament, userId) {
  for (const match of tournament.matches) {
    if (match.player1 === userId || match.player2 === userId) {
      return match;
    }
  }
  return null;
}

function isTournamentReady(tournamentId) {
  const tournament = tournaments.get(tournamentId);
  return tournament && tournament.players.length === MAX_PLAYERS;
}

function generateBracket(tournamentId) {
  // Empareja jugadores al azar para la primera ronda
  const tournament = tournaments.get(tournamentId);
  if (!tournament || tournament.players.length !== MAX_PLAYERS) return { error: 'Torneo no listo' };
  
  const shuffled = [...tournament.players].sort(() => Math.random() - 0.5);
  const bracket = [];
  
  // Cuartos de final (4 partidas)
  for (let i = 0; i < MAX_PLAYERS; i += 2) {
    bracket.push({
      player1: shuffled[i],
      player2: shuffled[i + 1],
      winner: null,
      roomId: null, // Se asignará al crear la partida
      startTime: null,
      endTime: null,
      disconnectedPlayer: null,
      disconnectTime: null,
    });
  }
  
  tournament.bracket = [bracket]; // Array de rondas, cada ronda es array de matches
  tournament.currentRound = 0;
  tournament.status = TOURNAMENT_STATUS.IN_PROGRESS;
  tournament.startTime = Date.now();
  
  return { success: true, bracket };
}

function advanceTournament(tournamentId) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament || tournament.status !== TOURNAMENT_STATUS.IN_PROGRESS) return;
  
  const currentRound = tournament.bracket[tournament.currentRound];
  const allMatchesFinished = currentRound.every(match => match.winner);
  
  if (allMatchesFinished) {
    // Crear siguiente ronda
    const winners = currentRound.map(match => match.winner);
    if (winners.length === 1) {
      // Final terminada
      tournament.winner = winners[0];
      tournament.status = TOURNAMENT_STATUS.FINISHED;
    } else {
      // Crear siguiente ronda
      const nextRound = [];
      for (let i = 0; i < winners.length; i += 2) {
        nextRound.push({
          player1: winners[i],
          player2: winners[i + 1],
          winner: null,
          roomId: null,
          startTime: null,
          endTime: null,
          disconnectedPlayer: null,
          disconnectTime: null,
        });
      }
      tournament.bracket.push(nextRound);
      tournament.currentRound++;
    }
  }
}

function getTournament(tournamentId) {
  return tournaments.get(tournamentId);
}

function listTournaments() {
  return Array.from(tournaments.values());
}

function getActiveTournaments() {
  return Array.from(tournaments.values()).filter(t => 
    t.status === TOURNAMENT_STATUS.WAITING || 
    t.status === TOURNAMENT_STATUS.READY
  );
}

// Exportar funciones necesarias
export {
  createTournament,
  joinTournament,
  handlePlayerDisconnect,
  isTournamentReady,
  generateBracket,
  advanceTournament,
  getTournament,
  listTournaments,
  getActiveTournaments,
  TOURNAMENT_STATUS,
  MATCH_TIME_LIMIT,
}; 