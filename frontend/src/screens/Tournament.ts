const MOCK_TOURNAMENT_ID = 'MOCK123';
const MOCK_USER = 'You';

let tournamentState = {
  status: 'idle',
  players: [],
  bracket: [],
  currentRoundIndex: 0,
  matchIndex: 0,
  winner: null,
};

export function renderTournament(): void {
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = `
    <div class="min-h-screen grid grid-cols-1 w-full max-w-screen-2xl mx-auto pt-6 px-4">
      <div class="w-full max-w-screen-2xl mx-auto flex flex-col">
        <div id="tournament-stage" class="flex w-full min-h-[480px] overflow-hidden"></div>
        <div class="mt-4 flex gap-2 justify-center">
          <button id="btn-start" class="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded">Start</button>
          <button id="btn-advance" class="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded">Advance</button>
          <button id="btn-finish" class="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded">Finish</button>
          <button id="btn-reset" class="bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded">Reset</button>
        </div>
      </div>
    </div>
  `;

  renderTournamentStage();
  setupTournamentButtons();
}

function setupTournamentButtons(): void {
  document.getElementById('btn-join')?.addEventListener('click', joinTournamentMock);
  document.getElementById('btn-start')?.addEventListener('click', startTournamentMock);
  document.getElementById('btn-advance')?.addEventListener('click', advanceTournamentMock);
  document.getElementById('btn-finish')?.addEventListener('click', finishTournamentMock);
  document.getElementById('btn-reset')?.addEventListener('click', resetTournamentMock);
}

function renderTournamentStage(): void {
  const stage = document.getElementById('tournament-stage');
  if (!stage) return;
  stage.innerHTML = '';

  if (tournamentState.status === 'idle' || tournamentState.status === 'waiting') {
    stage.innerHTML = tournamentState.status === 'idle'
      ? `
        <div class="w-full h-full flex items-center justify-center bg-black/40">
          <button id="btn-join" class="bg-indigo-600 text-white text-xl font-bold px-6 py-3 rounded shadow-lg hover:bg-indigo-900 transition">
            Join Tournament
          </button>
        </div>
      `
      : `
        <div class="w-full h-full p-6 bg-black/40 flex flex-col items-center justify-center space-y-4">
		<h2 class="text-indigo-200 text-2xl font-bold mb-2">Waitroom</h2>
          ${tournamentState.players.map((p, i) => {
            const opponent = tournamentState.players[i ^ 1] ?? 'TBD';
            if (i % 2 === 0) {
              return `
                <div class="grid grid-cols-3 items-center justify-items-center w-full max-w-[700px] text-white text-xl gap-x-6">
                  <div class="flex items-center gap-3 justify-end w-full">
                    <div class="w-12 h-12 rounded-full bg-indigo-900 flex items-center justify-center">
                      <span class="material-symbols-outlined text-white text-xl">person</span>
                    </div>
                    <span class="font-bold">${p}</span>
                  </div>
                  <div class="flex justify-center">
                    <span class="bg-indigo-600 rounded-full px-6 py-2 text-white font-bold text-lg text-center w-fit">vs</span>
                  </div>
                  <div class="flex items-center gap-3 justify-start w-full">
                    <span class="font-bold">${opponent}</span>
                    <div class="w-12 h-12 rounded-full bg-indigo-900 flex items-center justify-center">
                      <span class="material-symbols-outlined text-white text-xl">person</span>
                    </div>
                  </div>
                </div>
              `;
            }
            return '';
          }).join('')}
        </div>
      `;
    setupTournamentButtons();
    return;
  }

	const layoutWrapper = document.createElement('div');
layoutWrapper.className = 'p-4 flex w-full h-full gap-4';

// Bracket section
const bracketSection = document.createElement('div');
bracketSection.className = 'flex flex-col items-center';
bracketSection.innerHTML = `<h2 class="text-indigo-200 text-xl font-bold mb-4">Brackets</h2>`;

const bracketView = document.createElement('div');
bracketView.id = 'bracket-view';
bracketView.className = 'flex overflow-x-auto items-center h-full';
bracketSection.appendChild(bracketView);

// Match preview section
const matchSection = document.createElement('div');
matchSection.className = 'flex flex-col items-center flex-1';
matchSection.innerHTML = `<h2 class="text-indigo-200 text-xl font-bold mb-4">Matches</h2>`;

const matchPreview = document.createElement('div');
matchPreview.id = 'match-preview';
matchPreview.className = 'bg-black/40 flex-1 p-4 rounded w-full flex justify-center items-center';
matchSection.appendChild(matchPreview);

// Add to layout
layoutWrapper.appendChild(bracketSection);
layoutWrapper.appendChild(matchSection);
stage.appendChild(layoutWrapper);

//   const bracketView = document.createElement('div');
//   bracketView.id = 'bracket-view';
//   bracketView.className = 'flex overflow-x-auto items-center pr-4 h-full';

//   const matchPreview = document.createElement('div');
//   matchPreview.id = 'match-preview';
//   matchPreview.className = 'bg-black/40 flex-1 p-4 ml-4 rounded h-full flex justify-center items-center';

//   const layoutWrapper = document.createElement('div');
//   layoutWrapper.className = 'p-4 flex w-full h-full';

//   layoutWrapper.appendChild(bracketView);
//   layoutWrapper.appendChild(matchPreview);
//   stage.appendChild(layoutWrapper);

  renderBracketRounds(tournamentState.bracket);
  renderMatchPreview();
}

function getWinnerForMatch(roundIndex: number, matchIndex: number): string | null {
  const isLastRound = roundIndex === tournamentState.bracket.length - 2;
  const isChampionColumn = roundIndex === tournamentState.bracket.length - 1;

  if (isChampionColumn && tournamentState.status === 'finished') {
    return tournamentState.winner;
  }

  if (isLastRound && tournamentState.status === 'finished') {
    return tournamentState.winner;
  }

  const nextRound = tournamentState.bracket[roundIndex + 1];
  if (nextRound && nextRound[matchIndex] && nextRound[matchIndex] !== 'TBD') {
    return nextRound[matchIndex];
  }

  return null;
}

function renderBracketRounds(bracket: string[][]): void {
  const container = document.getElementById('bracket-view');
  if (!container) return;
  container.innerHTML = '';

  bracket.forEach((round, roundIndex) => {
    if (roundIndex > tournamentState.currentRoundIndex && tournamentState.status !== 'finished') return;

    const column = document.createElement('div');
    column.className = 'flex flex-col items-center justify-center space-y-12 min-w-[200px] px-4';

    const isChampionColumn = roundIndex === bracket.length - 1;

    for (let i = 0; i < round.length; i += 2) {
      const p1 = round[i];
      const p2 = round[i + 1];
      const matchIndex = Math.floor(i / 2);
      const winner = getWinnerForMatch(roundIndex, matchIndex);

      const isWinnerP1 = winner && winner === p1;
      const isWinnerP2 = winner && winner === p2;

      const getBoxClass = (player: string | undefined | null, isWinner: boolean) => {
        if (!player || player === 'TBD') return 'btn-primary';
        return isWinner ? 'btn-primary' : 'bg-gray-500 text-white';
      };

      const match = document.createElement('div');
      match.className = 'relative flex flex-col items-center space-y-1 w-full';

      const box1 = document.createElement('div');
      box1.className = `rounded text-sm text-center px-3 py-2 min-w-[100px] ${getBoxClass(p1, isWinnerP1)}`;
      box1.title = p1 ?? 'TBD';
      box1.innerText = p1 ?? 'TBD';

      const box2 = document.createElement('div');
      box2.className = `rounded text-sm text-center px-3 py-2 min-w-[100px] ${getBoxClass(p2, isWinnerP2)}`;
      box2.title = p2 ?? 'TBD';
      box2.innerText = p2 ?? 'TBD';

      const connector = document.createElement('div');
      connector.className = 'h-8 flex flex-col justify-center items-center';
      connector.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 40 40">
          <path d="M0 20 H20 V0" stroke="white" stroke-width="2" fill="none"/>
          <path d="M0 20 H20 V40" stroke="white" stroke-width="2" fill="none"/>
        </svg>
      `;

      match.appendChild(box1);
		if (!isChampionColumn) match.appendChild(connector);
		if (!isChampionColumn) match.appendChild(box2);
    //   match.appendChild(box2);
      column.appendChild(match);
    }

    container.appendChild(column);
  });
}

function renderMatchPreview(): void {
  const container = document.getElementById('match-preview');
  if (!container) return;
  container.innerHTML = '';

	if (tournamentState.status === 'finished') {
	   container.classList.remove('bg-black/40');
    container.innerHTML = `
     <div class="btn-secondary p-10 h-1/3 flex justify-center items-center text-center hover:scale-105 transition-transform duration-300 animate-bounce rounded-full">
  Winner: ${tournamentState.winner}
</div>
    `;
    return;
  }

  const round = tournamentState.bracket[tournamentState.currentRoundIndex];
  const matches = [];

  for (let i = 0; i < round.length; i += 2) {
    const p1 = round[i] ?? 'TBD';
    const p2 = round[i + 1] ?? 'TBD';

    matches.push(`
      <div class="grid grid-cols-3 items-center justify-items-center w-full max-w-[700px] text-white text-xl gap-x-6">
        <div class="flex items-center gap-3 justify-end w-full">
          <div class="w-12 h-12 rounded-full bg-indigo-900 flex items-center justify-center">
            <span class="material-symbols-outlined text-white text-xl">person</span>
          </div>
          <span class="font-bold">${p1}</span>
        </div>
        <div class="flex justify-center">
          <span class="bg-indigo-600 rounded-full px-6 py-2 text-white font-bold text-lg text-center w-fit">vs</span>
        </div>
        <div class="flex items-center gap-3 justify-start w-full">
          <span class="font-bold">${p2}</span>
          <div class="w-12 h-12 rounded-full bg-indigo-900 flex items-center justify-center">
            <span class="material-symbols-outlined text-white text-xl">person</span>
          </div>
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

// ========== MOCK FUNCTIONS ==========

function joinTournamentMock(): void {
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
  }, 1500);
}


function startTournamentMock(): void {
  if (tournamentState.players.length < 2) return;
  const initialRound = [...tournamentState.players];
  const rounds: string[][] = [initialRound];

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

function advanceTournamentMock(): void {
  const { bracket, currentRoundIndex } = tournamentState;
  if (currentRoundIndex >= bracket.length - 1) return;

  const nextRound: string[] = [];
  for (let i = 0; i < bracket[currentRoundIndex].length; i += 2) {
    const p1 = bracket[currentRoundIndex][i];
    const p2 = bracket[currentRoundIndex][i + 1];
    const winner = Math.random() > 0.5 ? p1 : p2;
    nextRound.push(winner);
  }

  bracket[currentRoundIndex + 1] = nextRound;
  tournamentState.currentRoundIndex += 1;

  if (tournamentState.currentRoundIndex === bracket.length - 1) {
    tournamentState.status = 'finished';
    tournamentState.winner = bracket.at(-1)[0];
  }

  renderTournamentStage();
}

function finishTournamentMock(): void {
  const secondLastRound = tournamentState.bracket.at(-2);
  if (!secondLastRound) return;

  const p1 = secondLastRound[0];
  const p2 = secondLastRound[1];
  const winner = Math.random() > 0.5 ? p1 : p2;

  tournamentState.bracket[tournamentState.bracket.length - 1] = [winner];
  tournamentState.winner = winner;
  tournamentState.status = 'finished';

  renderTournamentStage();
}

function resetTournamentMock(): void {
  tournamentState = {
    status: 'idle',
    players: [],
    bracket: [],
    currentRoundIndex: 0,
    matchIndex: 0,
    winner: null,
  };
  renderTournamentStage();
}
