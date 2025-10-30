// Tournament Brackets - Lógica de generación y gestión de brackets

/**
 * Genera un bracket de eliminación simple para 8 jugadores
 * @param {Array<{userId: number, username: string}>} players - Array de 8 jugadores
 * @returns {Object} - Estructura del bracket
 */
export function generateBracket(players) {
  if (players.length !== 8) {
    throw new Error('Se requieren exactamente 8 jugadores para el bracket');
  }

  // Mezclar jugadores aleatoriamente para emparejamientos justos
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  // Crear cuartos de final (4 matches)
  const quarterfinals = [
    {
      matchId: 1,
      player1: shuffled[0],
      player2: shuffled[1],
      winner: null,
      status: 'pending',
      score1: null,
      score2: null
    },
    {
      matchId: 2,
      player1: shuffled[2],
      player2: shuffled[3],
      winner: null,
      status: 'pending',
      score1: null,
      score2: null
    },
    {
      matchId: 3,
      player1: shuffled[4],
      player2: shuffled[5],
      winner: null,
      status: 'pending',
      score1: null,
      score2: null
    },
    {
      matchId: 4,
      player1: shuffled[6],
      player2: shuffled[7],
      winner: null,
      status: 'pending',
      score1: null,
      score2: null
    }
  ];

  // Crear estructura de semifinales (vacías por ahora)
  const semifinals = [
    {
      matchId: 5,
      player1: null,
      player2: null,
      winner: null,
      status: 'pending',
      score1: null,
      score2: null
    },
    {
      matchId: 6,
      player1: null,
      player2: null,
      winner: null,
      status: 'pending',
      score1: null,
      score2: null
    }
  ];

  // Crear final (vacía por ahora)
  const finals = [
    {
      matchId: 7,
      player1: null,
      player2: null,
      winner: null,
      status: 'pending',
      score1: null,
      score2: null
    }
  ];

  return {
    rounds: [
      { name: 'Quarterfinals', matches: quarterfinals },
      { name: 'Semifinals', matches: semifinals },
      { name: 'Finals', matches: finals }
    ],
    currentRound: 0, // Empieza en cuartos de final
    status: 'in_progress'
  };
}

/**
 * Registra el ganador de un match y actualiza el bracket
 * @param {Object} bracket - El bracket actual
 * @param {number} matchId - ID del match que terminó
 * @param {Object} winner - Jugador ganador {userId, username}
 * @param {number} score1 - Score del player1
 * @param {number} score2 - Score del player2
 * @returns {Object} - Bracket actualizado
 */
export function updateBracketWithWinner(bracket, matchId, winner, score1, score2) {
  const currentRound = bracket.rounds[bracket.currentRound];
  
  // Encontrar el match
  const match = currentRound.matches.find(m => m.matchId === matchId);
  if (!match) {
    throw new Error(`Match ${matchId} no encontrado en ronda actual`);
  }

  // Registrar ganador y scores
  match.winner = winner;
  match.status = 'completed';
  match.score1 = score1;
  match.score2 = score2;

  return bracket;
}

/**
 * Verifica si una ronda está completa y avanza a la siguiente
 * @param {Object} bracket - El bracket actual
 * @returns {Object|null} - Nueva ronda si está lista, null si aún hay matches pendientes
 */
export function advanceRoundIfReady(bracket) {
  const currentRound = bracket.rounds[bracket.currentRound];
  
  // Verificar si todos los matches de la ronda están completos
  const allComplete = currentRound.matches.every(m => m.status === 'completed');
  
  if (!allComplete) {
    return null; // Aún hay matches pendientes
  }

  // Si era la final, el torneo terminó
  if (bracket.currentRound === bracket.rounds.length - 1) {
    bracket.status = 'finished';
    const finalMatch = currentRound.matches[0];
    bracket.winner = finalMatch.winner;
    return { tournamentFinished: true, winner: finalMatch.winner };
  }

  // Avanzar a siguiente ronda
  bracket.currentRound++;
  const nextRound = bracket.rounds[bracket.currentRound];

  // Poblar la siguiente ronda con los ganadores
  if (bracket.currentRound === 1) {
    // Semifinales - emparejamientos de cuartos
    nextRound.matches[0].player1 = currentRound.matches[0].winner;
    nextRound.matches[0].player2 = currentRound.matches[1].winner;
    nextRound.matches[1].player1 = currentRound.matches[2].winner;
    nextRound.matches[1].player2 = currentRound.matches[3].winner;
  } else if (bracket.currentRound === 2) {
    // Final - emparejamientos de semifinales
    nextRound.matches[0].player1 = currentRound.matches[0].winner;
    nextRound.matches[0].player2 = currentRound.matches[1].winner;
  }

  return { nextRound: nextRound, roundNumber: bracket.currentRound };
}

