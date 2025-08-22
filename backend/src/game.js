// Estado inicial del juego Pong
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 20;
const WINNING_SCORE = 5; // Puntuación para ganar

const initialState = (options = {}) => ({
  ball: {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    vx: 15, // velocidad inicial x (aumentada de 5 a 15)
    vy: 10, // velocidad inicial y (aumentada de 3 a 10)
    size: BALL_SIZE
  },
  players: {
    player1: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
    player2: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 }
  },
  gameEnded: false,
  winner: null,
  // Opciones para torneos
  isTournament: options.isTournament || false,
  timeLimit: options.timeLimit || null, // Tiempo límite en milisegundos
  startTime: options.startTime || null,
  goldenGoal: false, // Para gol de oro en empates
});

let state = initialState();

function resetGame(options = {}) {
  state = initialState(options);
}

function movePlayer(player, dy) {
  if (!state.players[player] || state.gameEnded) return;
  state.players[player].y += dy;
  // Limitar dentro de los bordes
  if (state.players[player].y < 0) state.players[player].y = 0;
  if (state.players[player].y > GAME_HEIGHT - PADDLE_HEIGHT) state.players[player].y = GAME_HEIGHT - PADDLE_HEIGHT;
}

function updateBall() {
  if (state.gameEnded) return;
  
  state.ball.x += state.ball.vx;
  state.ball.y += state.ball.vy;

  // Rebote en la parte superior/inferior
  if (state.ball.y <= 0 || state.ball.y + BALL_SIZE >= GAME_HEIGHT) {
    state.ball.vy *= -1;
  }

  // Rebote en los laterales (puntuación)
  if (state.ball.x <= 0) {
    // Player2 anota
    state.players.player2.score++;
    resetBall();
    checkGameEnd();
  } else if (state.ball.x + BALL_SIZE >= GAME_WIDTH) {
    // Player1 anota
    state.players.player1.score++;
    resetBall();
    checkGameEnd();
  }
}

function resetBall() {
  state.ball.x = GAME_WIDTH / 2;
  state.ball.y = GAME_HEIGHT / 2;
  // Invertir dirección inicial para que sea aleatoria
  state.ball.vx = Math.random() > 0.5 ? 15 : -15; // Aumentada de 5 a 15
  state.ball.vy = Math.random() > 0.5 ? 10 : -10; // Aumentada de 3 a 10
}

function checkGameEnd() {
  // Verificar tiempo límite para torneos
  if (state.isTournament && state.timeLimit && state.startTime) {
    const elapsed = Date.now() - state.startTime;
    if (elapsed >= state.timeLimit * 1000) { // timeLimit está en segundos, convertir a ms
      // Tiempo agotado, verificar empate
      if (state.players.player1.score === state.players.player2.score) {
        // Empate - activar gol de oro
        if (!state.goldenGoal) {
          state.goldenGoal = true;
          console.log('⚽ Gol de oro activado!');
          return; // No terminar el juego, esperar el gol de oro
        }
      } else {
        // No empate - terminar juego
        state.gameEnded = true;
        state.winner = state.players.player1.score > state.players.player2.score ? 'player1' : 'player2';
        return;
      }
    }
  }
  
  // Verificar puntuación normal (solo si no es torneo o no hay tiempo límite)
  if (!state.isTournament || !state.timeLimit) {
    if (state.players.player1.score >= WINNING_SCORE) {
      state.gameEnded = true;
      state.winner = 'player1';
    } else if (state.players.player2.score >= WINNING_SCORE) {
      state.gameEnded = true;
      state.winner = 'player2';
    }
  }
  
  // Si es gol de oro, cualquier punto termina el juego
  if (state.goldenGoal) {
    if (state.players.player1.score > state.players.player2.score) {
      state.gameEnded = true;
      state.winner = 'player1';
    } else if (state.players.player2.score > state.players.player1.score) {
      state.gameEnded = true;
      state.winner = 'player2';
    }
  }
}

function getGameResult() {
  if (!state.gameEnded) return null;
  
  return {
    winner: state.winner,
    scores: {
      player1: state.players.player1.score,
      player2: state.players.player2.score
    }
  };
}

function gameTick() {
  updateBall();
}

function getState() {
  return state;
}

export { resetGame, movePlayer, gameTick, getState, getGameResult };
