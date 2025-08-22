const MOCK_TOURNAMENT_ID = 'MOCK123';
const MOCK_USER = 'You';


let tournamentState = {
  status: 'idle',
  players: [],
  bracket: [],
  currentRoundIndex: 0,
  matchIndex: 0,
  winner: null,
  matchScores: {},
  matchStates: {},
};

export function renderTournament() {
  const socket = new WebSocket(`${API_BASE_URL.replace('https', 'wss')}/ws`);
  //const socket = new WebSocket(`wss://127.0.0.1:443/ws`);
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({
      userId: 1,
      //type: 'message',
      joinOrCreateTournament: 'true',
    }));
  });
  socket.send(JSON.stringify({type: 'message', userId: 1, joinOrCreateTournament: 'true'}));
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = `
    <div class="grid grid-cols-1 w-full mx-auto pt-6 px-4">
      <div class="w-full mx-auto flex flex-col">
        <div id="tournament-stage" class="flex w-full min-h-[480px] overflow-hidden"></div>
        <div class="mt-4 flex gap-2 justify-center">
          <button id="btn-start" class="bg-indigo-600 text-white text-xs font-bold px-4 py-2 ">Start</button>
          <button id="btn-advance" class="bg-indigo-600 text-white text-xs font-bold px-4 py-2 ">Advance</button>
          <button id="btn-finish" class="bg-indigo-600 text-white text-xs font-bold px-4 py-2 ">Finish</button>
          <button id="btn-reset" class="bg-indigo-700 text-white text-xs font-bold px-4 py-2 ">Reset</button>
        </div>
      </div>
    </div>
  `;

  renderTournamentStage();
  setupTournamentButtons();
}

function setupTournamentButtons() {
  document.getElementById('btn-join')?.addEventListener('click', joinTournamentMock);
  document.getElementById('btn-start')?.addEventListener('click', startTournamentMock);
  document.getElementById('btn-advance')?.addEventListener('click', advanceTournamentMock);
  document.getElementById('btn-finish')?.addEventListener('click', finishTournamentMock);
  document.getElementById('btn-reset')?.addEventListener('click', resetTournamentMock);
  document.getElementById('btn-ready')?.addEventListener('click', () => {
	  console.log('readyBtn');
  });
}

function renderTournamentStage() {
  const stage = document.getElementById('tournament-stage');
  if (!stage) return;
  stage.innerHTML = '';

  if (tournamentState.status === 'idle') {
    stage.innerHTML = `
      <div class="w-full h-full flex items-center justify-center bg-black/40">
        <button id="btn-join" class="bg-indigo-600 text-white text-xl font-bold px-6 py-3 shadow-lg hover:bg-indigo-900 transition">
          Join Tournament
        </button>
      </div>
    `;
    setupTournamentButtons();
    return;
  }

  if (tournamentState.status === 'waiting') {
    stage.innerHTML = renderWaitingRoom(tournamentState.players);
    setupTournamentButtons();
    return;
  }

  // === bracket + match layout ===
  const layoutWrapper = document.createElement('div');
  layoutWrapper.className = 'p-4 flex w-full h-full gap-4';

  const bracketSection = document.createElement('div');
  bracketSection.className = 'flex flex-col items-center';
  bracketSection.innerHTML = `<h2 class="text-indigo-200 text-xl font-bold mb-4">Brackets</h2>`;

  const bracketView = document.createElement('div');
  bracketView.id = 'bracket-view';
  bracketView.className = 'flex overflow-x-auto items-center h-full';
  bracketSection.appendChild(bracketView);

  const matchSection = document.createElement('div');
  matchSection.className = 'flex flex-col items-center flex-1';
  matchSection.innerHTML = `<h2 class="text-indigo-200 text-xl font-bold mb-4">Matches</h2>`;

  const matchPreview = document.createElement('div');
  matchPreview.id = 'match-preview';
  matchPreview.className = 'border border-[--primary-color] flex-1 p-4 w-full flex justify-center items-center';
  matchSection.appendChild(matchPreview);

  layoutWrapper.appendChild(bracketSection);
  layoutWrapper.appendChild(matchSection);
  stage.appendChild(layoutWrapper);

  renderBracketRounds(tournamentState.bracket);
  renderMatchPreview();
}

// WAITING ROOM COMPONENT

function renderWaitingRoom(players) {
  return `
    <div class="w-full h-full border border-[--primary-color] p-6 flex flex-col items-center justify-center text-center text-white space-y-6">
      <h1 class="text-[--primary-color] text-3xl font-bold tracking-wide">Welcome to the Tournament</h1>
      <div class="text-white text-lg">Waiting room</div>
      <div class="text-yellow-300 font-bold text-lg">Waiting to start your match</div>
      <div class="text-sm mt-2">${players.length} / 8 players Ready</div>

      <div class="flex flex-wrap justify-center items-center gap-4 mt-4">
        ${players.map((p, i) => {
          const isCurrent = p === MOCK_USER;
          const isReady = i % 2 === 0;
          const symbol = p === 'David' ? '⚡' : isReady ? 'READY' : '';
          const border = isCurrent ? 'border-yellow-500' : 'border-[--primary-color]';

          return `
            <div class="flex items-center gap-4 px-4 py-2 border-2 ${border} shadow-md min-w-[220px]">
              <div class="w-10 h-10 bg-gray-300"></div>
              <div class="flex flex-col items-start text-left">
                <div class="text-white font-bold text-sm">${p.toUpperCase()}</div>
                <div class="text-red-700 text-xs">1258 pts</div>
              </div>
              <div class="ml-auto text-white text-xs ">${symbol}</div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="flex gap-6 mt-8">
        <button id="btn-ready" class="bg-yellow-400 text-black px-6 py-2  shadow-lg font-bold text-sm hover:bg-yellow-500">
          READY
        </button>
        <button id="btn-reset" class="btn-primary text-white px-6 py-2  shadow-lg font-bold text-sm hover:bg-indigo-600">
          BACK TO MENU
        </button>
      </div>
    </div>
  `;
}

// Brackets

function getWinnerForMatch(roundIndex, matchIndex) {
  const isChampionColumn = roundIndex === tournamentState.bracket.length - 1;
  if (isChampionColumn && tournamentState.status === 'finished') {
    return tournamentState.winner;
  }

  const nextRound = tournamentState.bracket[roundIndex + 1];
  return nextRound?.[matchIndex] ?? null;
}

function renderBracketRounds(bracket) {
  const container = document.getElementById('bracket-view');
  if (!container) return;
  container.innerHTML = '';

  const maxRounds = bracket.length;

  for (let roundIndex = 0; roundIndex < maxRounds; roundIndex++) {
    const round = bracket[roundIndex];

    const column = document.createElement('div');
    column.className = 'flex flex-col items-center justify-center space-y-12 min-w-[150px] px-4';

    const matchCount = Math.ceil(round.length / 2);
    for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
      const p1 = round[matchIndex * 2] ?? 'TBD';
      const p2 = round[matchIndex * 2 + 1] ?? 'TBD';
      const winner = getWinnerForMatch(roundIndex, matchIndex);

      const isWinnerP1 = winner === p1;
      const isWinnerP2 = winner === p2;

      const getClass = (player, isWinner) =>
        !player || player === 'TBD'
          ? 'btn-looser'
          : isWinner
          ? 'btn-winner'
          : 'btn-looser';

      const match = document.createElement('div');
      match.className = 'relative flex flex-col items-center space-y-1 w-full';

      const box1 = document.createElement('div');
      box1.className = `text-sm text-center px-3 py-2 min-w-[100px] ${getClass(p1, isWinnerP1)}`;
    //   box1.innerText = (roundIndex === 0 || tournamentState.status === 'finished') ? p1 : 'TBD';

	  box1.innerText = p1;


      const box2 = document.createElement('div');
      box2.className = `text-sm text-center px-3 py-2 min-w-[100px] ${getClass(p2, isWinnerP2)}`;
    //   box2.innerText = (roundIndex === 0 || tournamentState.status === 'finished') ? p2 : 'TBD';
		box2.innerText = p2;
		
      const connector = document.createElement('div');
      connector.className = 'h-8 flex flex-col justify-center items-center';
      connector.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 40 40">
          <path d="M0 20 H20 V0" stroke="white" stroke-width="2" fill="none"/>
          <path d="M0 20 H20 V40" stroke="white" stroke-width="2" fill="none"/>
        </svg>
      `;

      match.appendChild(box1);
      if (roundIndex < maxRounds - 1) {
        match.appendChild(connector);
        match.appendChild(box2);
      }

      column.appendChild(match);
    }

    container.appendChild(column);
  }
}


// function renderMatchPreview() {
//   const container = document.getElementById('match-preview');
//   if (!container) return;
//   container.innerHTML = '';

//   if (tournamentState.status === 'finished') {
//     container.innerHTML = `
//       <div class="btn-secondary p-10 h-1/3 flex justify-center items-center text-center hover:scale-105 transition-transform duration-300 animate-bounce">
//         Winner: ${tournamentState.winner}
//       </div>
//     `;
//     return;
//   }

//   const round = tournamentState.bracket[tournamentState.currentRoundIndex];
//   const matches = [];

//   for (let i = 0; i < round.length; i += 2) {
//     const p1 = round[i] ?? 'TBD';
//     const p2 = round[i + 1] ?? 'TBD';

//     const key = `${tournamentState.currentRoundIndex}-${i / 2}`;
// const scores = tournamentState.matchScores[key];
// const s1 = scores?.[p1];
// const s2 = scores?.[p2];

// const getScoreSpan = (score, isWinner) => `
//   <span class="${isWinner ? 'text-green-400' : 'text-yellow-400'} font-bold">${score ?? '-'}</span>
// `;

// matches.push(`
//   <div class="border border-[--primary-color] p-3 w-full max-w-[500px] flex justify-between items-center gap-4 bg-black/30">
//     <div class="flex items-center gap-2">
//       <span class="btn-looser">${p1}</span>
//       ${getScoreSpan(s1, s1 > s2)}
//     </div>
//     <div class="text-sm text-gray-400">Finished</div>
//     <div class="flex items-center gap-2">
//       ${getScoreSpan(s2, s2 > s1)}
//       <span class="btn-looser">${p2}</span>
//     </div>
//   </div>
// `);

//   }

//   container.innerHTML = `
//     <div class="flex flex-col items-center space-y-6 w-full">
//       ${matches.join('')}
//     </div>
//   `;
// }

// Mock

function joinTournamentMock() {
  tournamentState.players = [];
  tournamentState.status = 'waiting';

  const mockPlayers = [MOCK_USER, 'Jorge', 'David', 'Miguel', 'Gabriel', 'Maria', 'Miguel', 'Grace'];

  let index = 0;
  const interval = setInterval(() => {
    if (index >= mockPlayers.length) {
      clearInterval(interval);
      return;
    }

    tournamentState.players.push(mockPlayers[index]);
    index++;
    renderTournamentStage();
  }, 600);
}

function startTournamentMock() {
  if (tournamentState.players.length < 2) return;
  const initialRound = [...tournamentState.players];
  const rounds = [initialRound];
  let matchCount = initialRound.length / 2;

  while (matchCount >= 1) {
    rounds.push(new Array(matchCount).fill('TBD'));
    matchCount /= 2;
  }

  tournamentState.bracket = rounds;
  tournamentState.status = 'in_progress';
  tournamentState.currentRoundIndex = 0;
  tournamentState.winner = null;

  renderTournamentStage();
}

// function advanceTournamentMock() {
//   const { bracket, currentRoundIndex } = tournamentState;
//   if (currentRoundIndex >= bracket.length - 1) return;

//   const nextRound = [];
//   for (let i = 0; i < bracket[currentRoundIndex].length; i += 2) {
//     const p1 = bracket[currentRoundIndex][i];
// 	const p2 = bracket[currentRoundIndex][i + 1];
// 	const s1 = Math.floor(Math.random() * 3) + 4;
// 	const s2 = Math.floor(Math.random() * 3) + 4;
// 	const winner = s1 > s2 ? p1 : p2;

// 	// Store scores
// 	tournamentState.matchScores[`${currentRoundIndex}-${i / 2}`] = {
// 	[p1]: s1,
// 	[p2]: s2,
// 	};

//     nextRound.push(winner);
//   }

//   bracket[currentRoundIndex + 1] = nextRound;
//   tournamentState.currentRoundIndex++;

//   if (tournamentState.currentRoundIndex === bracket.length - 1) {
//     tournamentState.status = 'finished';
//     tournamentState.winner = nextRound[0];
//   }

//   renderTournamentStage();
// }

function finishTournamentMock() {
  const lastMatch = tournamentState.bracket.at(-2);
  if (!lastMatch) return;
  const winner = Math.random() > 0.5 ? lastMatch[0] : lastMatch[1];

  tournamentState.bracket[tournamentState.bracket.length - 1] = [winner];
  tournamentState.status = 'finished';
  tournamentState.winner = winner;

  renderTournamentStage();
}

function resetTournamentMock() {
  tournamentState = {
    status: 'idle',
    players: [],
    bracket: [],
    currentRoundIndex: 0,
    matchIndex: 0,
	winner: null,
	matchScores: {},
	matchStates: {},
  };
  renderTournamentStage();
}



function advanceTournamentMock() {
  const { bracket, currentRoundIndex } = tournamentState;
  if (currentRoundIndex >= bracket.length - 1) return;

  const roundKeyPrefix = `${currentRoundIndex}-`;
  const allMatchesPlaying = Object.keys(tournamentState.matchStates)
    .filter(k => k.startsWith(roundKeyPrefix))
    .every(k => tournamentState.matchStates[k] === 'playing');

  if (!allMatchesPlaying) {
    for (let i = 0; i < bracket[currentRoundIndex].length; i += 2) {
      const key = `${currentRoundIndex}-${i / 2}`;
      tournamentState.matchStates[key] = 'playing';
    }
    renderTournamentStage();
    return;
  }

  const nextRound = [];
  for (let i = 0; i < bracket[currentRoundIndex].length; i += 2) {
    const p1 = bracket[currentRoundIndex][i];
    const p2 = bracket[currentRoundIndex][i + 1];
    const s1 = Math.floor(Math.random() * 3) + 4;
    const s2 = Math.floor(Math.random() * 3) + 4;
    const winner = s1 >= s2 ? p1 : p2;

    tournamentState.matchScores[`${currentRoundIndex}-${i / 2}`] = {
      [p1]: s1,
      [p2]: s2,
    };
    tournamentState.matchStates[`${currentRoundIndex}-${i / 2}`] = 'finished';

    nextRound.push(winner);
  }

  bracket[currentRoundIndex + 1] = nextRound;
  tournamentState.currentRoundIndex++;

  if (tournamentState.currentRoundIndex === bracket.length - 1) {
    tournamentState.status = 'finished';
    tournamentState.winner = nextRound[0];
  }

  renderTournamentStage();
}

function renderMatchPreview() {
  const container = document.getElementById('match-preview');
  if (!container) return;
  container.innerHTML = '';

  if (tournamentState.status === 'finished') {
  const main = document.getElementById('main');
  main!.innerHTML = `
    <div class="relative w-full flex justify-center items-center h-[700px] bg-gradient-to-br from-purple-800 via-indigo-900 to-black shadow-lg border-4 border-yellow-400 animate-pulse">
      <div class="absolute inset-0 animate-confetti pointer-events-none z-0"></div>

      <div class="relative z-10 text-center px-10">
        <h1 class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-red-500 animate-text-glow drop-shadow-lg">
          🎉 CHAMPION 🎉
        </h1>
        <div class="mt-4 text-4xl font-bold text-white animate-bounce">${tournamentState.winner}</div>
      </div>
    </div>
  `;
  return;
}


  const roundIndex = tournamentState.currentRoundIndex - 1;
  const round = tournamentState.bracket[roundIndex] ?? [];
  const matches = [];

  for (let i = 0; i < round.length; i += 2) {
    const p1 = round[i] ?? 'TBD';
    const p2 = round[i + 1] ?? 'TBD';
    const key = `${roundIndex}-${i / 2}`;
    const scores = tournamentState.matchScores[key];
    const s1 = scores?.[p1];
    const s2 = scores?.[p2];
    const state = tournamentState.matchStates[key] ?? 'waiting';

    const getScoreSpan = (score, isWinner) => `
      <span class="${isWinner ? 'text-green-400' : 'text-yellow-400'} font-bold">${score ?? '-'}</span>
    `;

    const statusText =
      state === 'playing'
        ? '<span class="text-blue-400 animate-pulse">Playing...</span>'
        : state === 'finished'
        ? '<span class="text-gray-400">Finished</span>'
        : '<span class="text-gray-500">Waiting</span>';

    matches.push(`
      <div class="border border-[--primary-color] p-3 w-full max-w-[500px] flex justify-between items-center gap-4 ">
        <div class="flex items-center gap-2">
          <span class="btn-looser">${p1}</span>
          ${getScoreSpan(s1, s1 > s2)}
        </div>
        <div class="text-sm">${statusText}</div>
        <div class="flex items-center gap-2">
          ${getScoreSpan(s2, s2 > s1)}
          <span class="btn-looser">${p2}</span>
        </div>
      </div>
    `);
  }

  container.innerHTML = `
    <div class="flex flex-col items-center space-y-6 w-full">
      ${matches.join('')}
    </div>
  `;
}
