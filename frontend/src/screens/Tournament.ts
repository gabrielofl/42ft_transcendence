const MOCK_USER = 1;
const API_BASE_URL = 'https://localhost:443';
const API_BASE_URL = 'https://localhost:443';

let socket: WebSocket | null = null;
let currentTournamentId: string | null = null;
let myMatch: { roomId: any, roundIndex: number, matchIndex: number, slot: 'player1' | 'player2' | null, opponent: any } = { roomId: null, roundIndex: 0, matchIndex: 0, slot: null, opponent: null };

const socketsByUser: Record<number, WebSocket> = {};

function getMySocket() {
  return socketsByUser[MOCK_USER] ?? socket;
}

const UI_DELAY = { assign: 200, toPlaying: 150, toFinished: 200, betweenMatches: 150, nextRound: 300, champion: 0 };
const timersByKey: Record<string, number> = {};
const finishedRooms = new Set<string>(); // dedup "finished" by roomId

function scheduleUIFor(key: string, fn: () => void, delay = 0) {
  if (timersByKey[key]) {
    clearTimeout(timersByKey[key]);
    delete timersByKey[key];
  }
  timersByKey[key] = window.setTimeout(() => {
    delete timersByKey[key];
    fn();
  }, delay);
}

const STATE_ORDER = { assigned: 0, waiting: 1, playing: 2, finished: 3 } as const;

function setMatchState(key: string, next: keyof typeof STATE_ORDER): boolean {
  const curr = (tournamentState.matchStates[key] as keyof typeof STATE_ORDER) ?? 'assigned';
  if (STATE_ORDER[next] >= STATE_ORDER[curr]) {
    tournamentState.matchStates[key] = next;
    return true;
  }
  return false;
}

function clearRoundVisualQueue(roundIndex: number) {
  Object.keys(timersByKey).forEach(k => {
    if (k === `round-${roundIndex}` || k.startsWith(`${roundIndex}-`)) {
      clearTimeout(timersByKey[k]);
      delete timersByKey[k];
    }
  });
}

function findMatchIndexByPlayers(roundIndex: number, p1: any, p2: any) {
  const round = tournamentState.bracket[roundIndex] || [];
  for (let i = 0; i < round.length; i += 2) {
    const a = round[i], b = round[i + 1];
    if ((a === p1 && b === p2) || (a === p2 && b === p1)) return i / 2;
  }
  return -1;
}

function rememberRoom(roomId: string, roundIndex: number, matchIndex: number, p1: any, p2: any) {
  roomIndexById[roomId] = { roundIndex, matchIndex, p1, p2 };
}

const MOCK_USER_MAP: Record<number, string> = {
  1: 'Jorge',
  2: 'David',
  3: 'Miguel',
  4: 'Gabriel',
  5: 'Maria',
  6: 'Grace',
  7: 'Miguel',
  8: 'Juan',
};

const roomIndexById: Record<string, { roundIndex: number; matchIndex: number; p1: any; p2: any }> = {};

function keyForRoom(roomId?: string | null) {
  if (!roomId) return null;
  const info = roomIndexById[roomId];
  return info ? `${info.roundIndex}-${info.matchIndex}` : null;
}

const MOCK_USER_IDS = Object.keys(MOCK_USER_MAP).map(Number);

function getDisplayName(userOrId: any) {
  return typeof userOrId === 'number'
    ? (MOCK_USER_MAP[userOrId] ?? `User #${userOrId}`)
    : String(userOrId);
}

let tournamentState: {
  status: string;
  players: any[];
  bracket: any[];
  currentRoundIndex: number;
  matchIndex: number;
  winner: any;
  matchScores: { [key: string]: any };
  matchStates: { [key: string]: any };
} = {
  status: 'idle',
  players: [],
  bracket: [],
  currentRoundIndex: 0,
  matchIndex: 0,
  winner: null,
  matchScores: {},
  matchStates: {},
};

function send(obj: object, ws?: WebSocket) {
  const target = ws ?? getMySocket();
  if (target && target.readyState === WebSocket.OPEN) {
    target.send(JSON.stringify(obj));
  }
}

function onSocketMessage(evt: MessageEvent) {
  let msg: any;
  try { msg = JSON.parse((evt as any).data); } catch { return; }

  const ev = msg?.event;
  if (!ev) return;

	const SILENCE_EVENTS = new Set([
		'game_state', 'player_scored', 'state', 'game_paused', 'game_over', 'tournament_countdown'
  ]);

  switch (ev) {
    case 'tournament_created': {
      currentTournamentId = msg.tournamentId;
      const t = msg.tournament;
      if (t?.players) joinTournamentFromServer(t.players);
      break;
    }

    case 'joined_existing_tournament': {
      currentTournamentId = msg.tournamentId;
      if (tournamentState.status === 'idle') {
        tournamentState.status = 'waiting';
        renderTournamentStage();
      }
      send({ userId: MOCK_USER, listTournaments: true });
      break;
    }

    case 'tournaments_list': {
      const list = msg.tournaments || [];
      const t = list.find((tt: any) => tt.id === currentTournamentId);
      if (t) {
        if (t.status === 'waiting' || t.status === 'ready') {
          joinTournamentFromServer(t.players || []);
        } else if (t.status === 'in_progress') {
          tournamentState.status = 'in_progress';
          tournamentState.players = [...(t.players || [])];
          renderTournamentStage();
        } else if (t.status === 'finished') {
          tournamentState.status = 'finished';
          tournamentState.winner = t.winner;
			renderTournamentStage();
			scheduleAutoReturn(); 
        }
      }
      break;
    }

    case 'tournament_bracket_created': {
      const matches = msg.matches || [];
      startTournamentFromMatches(matches);
      matches.forEach((m: any, idx: number) => {
        if (m.roomId) rememberRoom(m.roomId, 0, idx, m.player1, m.player2);
      });
      const mine = matches.find((m: any) => m.player1 === MOCK_USER || m.player2 === MOCK_USER);
      if (mine) {
        myMatch.roomId = mine.roomId;
        myMatch.roundIndex = 0;
        myMatch.matchIndex = matches.indexOf(mine);
        myMatch.slot = (mine.player1 === MOCK_USER) ? 'player1' : 'player2';
        myMatch.opponent = (mine.player1 === MOCK_USER) ? mine.player2 : mine.player1;
        send({ userId: MOCK_USER, joinTournamentRoom: myMatch.roomId });
      }
      break;
    }

   case 'tournament_match_assigned': {
	const roundIndex = (msg.round ?? 1) - 1;
	const matchIndex = typeof msg.matchIndex === 'number'
		? msg.matchIndex
		: findMatchIndexByPlayers(roundIndex, msg.player1, msg.player2);

	if (matchIndex >= 0 && msg.roomId) {
		rememberRoom(msg.roomId, roundIndex, matchIndex, msg.player1, msg.player2);

		const key = `${roundIndex}-${matchIndex}`;
		if (!tournamentState.matchStates[key] || tournamentState.matchStates[key] === 'assigned') {
	tournamentState.matchStates[key] = 'waiting';
	}
	}
	renderTournamentStage();
	break;
	}

    case 'joined_tournament_room': {
	if (myMatch.roomId && msg.roomId === myMatch.roomId) {
		const key = `${myMatch.roundIndex}-${myMatch.matchIndex}`;
		scheduleUIFor(key, () => {
		if (setMatchState(key, 'waiting')) renderTournamentStage();
		}, UI_DELAY.assign);
	}
	break;
	}


	case 'tournament_game_start': {
		const key = keyForRoom(msg.roomId);
	if (key) {
		scheduleUIFor(key, () => {
		if (setMatchState(key, 'playing')) renderTournamentStage();
		}, 0);
	}
	break;
	}

	case 'game_start': {
		const key = keyForRoom(msg.roomId);
	if (key) {
		if (tournamentState.matchStates[key] !== 'playing') {
		tournamentState.matchStates[key] = 'playing';
		renderTournamentStage();
		}
	}
	break;
	}

    case 'tournament_match_finished': {
      handleServerMatchFinish(msg);
      break;
    }

    case 'game_ended': {
      if (msg.isTournament && msg.roomId) {
        handleServerMatchFinish({
          tournamentId: msg.tournamentId,
          roomId: msg.roomId,
          winner: msg.winner?.userId,
          loser: msg.loser?.userId,
          scores: { player1: msg.winner?.score ?? 1, player2: msg.loser?.score ?? 0 },
        });
      }
      break;
    }

	case 'tournament_next_round_created': {
	const roundIndex = (msg.round ?? 2) - 1;
	const nextFlat: any[] = [];
	(msg.matches || []).forEach((m: any, idx: number) => {
		nextFlat.push(m.player1, m.player2);
		rememberRoom(m.roomId, roundIndex, idx, m.player1, m.player2);
	});

  scheduleUIFor(`round-${roundIndex}`, () => {
    clearRoundVisualQueue(roundIndex - 1);
    tournamentState.bracket[roundIndex] = nextFlat;
    tournamentState.currentRoundIndex = roundIndex;
    renderTournamentStage();
  }, UI_DELAY.nextRound);
  break;
}

    case 'tournament_next_round': {
      const roundIndex = (msg.round ?? 2) - 1;
      myMatch = {
        roomId: msg.roomId,
        roundIndex,
        matchIndex: msg.matchIndex ?? 0,
        slot: msg.slot,
        opponent: msg.opponent,
      };
      rememberRoom(
        msg.roomId,
        roundIndex,
        myMatch.matchIndex,
        msg.slot === 'player1' ? MOCK_USER : msg.opponent,
        msg.slot === 'player1' ? msg.opponent : MOCK_USER
      );
      send({ userId: MOCK_USER, joinTournamentRoom: msg.roomId });
      break;
    }

	case 'tournament_finished': {
	scheduleUIFor('champion', () => {
		tournamentState.status = 'finished';
		tournamentState.winner = msg.winner;
		renderTournamentStage();
		scheduleAutoReturn(); 
	}, 0);
	break;
	}


	case 'countdown': {
	const key = keyForRoom(msg.roomId);
	if (key) {
		renderTournamentStage();
	}
	break;
	}


	case 'player_scored': {
	let key = keyForRoom(msg.roomId);

	if (!key && myMatch.roomId && msg.roomId === myMatch.roomId) {
		key = `${myMatch.roundIndex}-${myMatch.matchIndex}`;
	}
	if (!key) break;

	const info = roomIndexById[msg.roomId];
	if (!info) break;

	const { p1, p2 } = info;
	const s = msg.scores || {};

	tournamentState.matchScores[key] = {
		[p1]: s.player1 ?? 0,
		[p2]: s.player2 ?? 0,
	};

	if (tournamentState.matchStates[key] !== 'finished') {
		setMatchState(key, 'playing');
	}
	renderTournamentStage();
	break;
	}

    case 'game_state':
    case 'state':
    case 'game_paused':
    case 'game_over': {
      break;
    }

    default: {
      if (!SILENCE_EVENTS.has(ev)) {
        console.log('[ws] unhandled:', ev, msg);
      }
      break;
    }
  }
}

function handleServerMatchFinish(payload: {
  roomId: string,
  tournamentId: any,
  winner?: any,
  loser?: any,
  scores?: { player1?: number, player2?: number }
}) {
  if (!payload?.roomId) return;
  if (finishedRooms.has(payload.roomId)) return;
  finishedRooms.add(payload.roomId);

  const key = keyForRoom(payload.roomId);
  if (!key) return;

  if (timersByKey[key]) {
    clearTimeout(timersByKey[key]);
    delete timersByKey[key];
  }

  const info = roomIndexById[payload.roomId];
  const { roundIndex, matchIndex } = info;
if (setMatchState(key, 'playing')) {
  renderTournamentStage();
}

  scheduleUIFor(key, () => {
    const p1 = tournamentState.bracket[roundIndex][matchIndex * 2];
    const p2 = tournamentState.bracket[roundIndex][matchIndex * 2 + 1];
    const s = payload.scores || {};
    tournamentState.matchScores[key] = { [p1]: s.player1 ?? 1, [p2]: s.player2 ?? 0 };
    setMatchState(key, 'finished');
    renderTournamentStage();
  }, UI_DELAY.toFinished);

  scheduleUIFor(`${key}-promote`, () => {
    const winnerId = payload.winner ?? guessWinnerFromScores(roundIndex, matchIndex);
    if (!tournamentState.bracket[roundIndex + 1]) {
      tournamentState.bracket[roundIndex + 1] = new Array(
        Math.ceil((tournamentState.bracket[roundIndex]?.length || 0) / 2)
      ).fill('');
    }
    tournamentState.bracket[roundIndex + 1][matchIndex] = winnerId;
    renderTournamentStage();
  }, UI_DELAY.betweenMatches);
}

function guessWinnerFromScores(roundIndex: number, matchIndex: number) {
  const key = `${roundIndex}-${matchIndex}`;
  const round = tournamentState.bracket[roundIndex] || [];
  const p1 = round[matchIndex * 2];
  const p2 = round[matchIndex * 2 + 1];
  const scores = tournamentState.matchScores[key] || {};
  const s1 = scores[p1] ?? 1;
  const s2 = scores[p2] ?? 0;
  return s1 >= s2 ? p1 : p2;
}

export function renderTournament() {
  try { if (socket && socket.readyState <= 1) socket.close(1000, 're-render'); } catch {}
  socket = new WebSocket(`${API_BASE_URL.replace('https', 'wss')}/ws`);
  socket.addEventListener('message', onSocketMessage);
  socket.addEventListener('error', (e) => console.log('[ws] error', e));
  socket.addEventListener('close', (e) => console.log('[ws] close', e.code, e.reason));
    send({ userId: MOCK_USER, listTournaments: true });
    }));
  // socket.send(JSON.stringify({type: 'message', userId: 1, joinOrCreateTournament: 'true'}));
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = `
    <div class="grid grid-cols-1 w-full mx-auto pt-6 px-4">
      <div class="w-full mx-auto flex flex-col">
        <div id="tournament-stage" class="flex w-full min-h-[480px] overflow-hidden"></div>
      </div>
    </div>
  `;

  renderTournamentStage();
  setupTournamentButtons();
}

function setupTournamentButtons() {
  document.getElementById('btn-join')?.addEventListener('click', joinTournament);
  document.getElementById('btn-ready')?.addEventListener('click', () => {
	if (myMatch.roomId) {
		send({ userId: MOCK_USER, joinTournamentRoom: myMatch.roomId });
		}
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

function renderWaitingRoom(players: any) {
  return `
    <div class="w-full h-full border border-[--primary-color] p-6 flex flex-col items-center justify-center text-center text-white space-y-6">
      <h1 class="text-[--primary-color] text-3xl font-bold tracking-wide">Welcome to the Tournament</h1>
      <div class="text-white text-lg">Waiting room</div>
      <div class="text-yellow-300 font-bold text-lg">Waiting to start your match</div>
      <div class="text-sm mt-2">${players.length} / 8 players Ready</div>

      <div class="flex flex-wrap justify-center items-center gap-4 mt-4">
        ${players.map((p: any, i: any) => {
          const isCurrent = p === MOCK_USER;
          const isReady = i % 2 === 0;
          const symbol = p === 'David' ? '⚡' : isReady ? 'READY' : '';
          const border = isCurrent ? 'border-yellow-500' : 'border-[--primary-color]';

          return `
            <div class="flex items-center gap-4 px-4 py-2 border-2 ${border} shadow-md min-w-[220px]">
              <div class="w-10 h-10 bg-gray-300"></div>
              <div class="flex flex-col items-start text-left">
                <div class="text-white font-bold text-sm">${getDisplayName(p).toUpperCase()}</div>
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
      </div>
    </div>
  `;
}

// Brackets

function getWinnerForMatch(roundIndex: any, matchIndex: any) {
  const isChampionColumn = roundIndex === tournamentState.bracket.length - 1;
  if (isChampionColumn && tournamentState.status === 'finished') {
    return tournamentState.winner;
  }

  const nextRound = tournamentState.bracket[roundIndex + 1];
  return nextRound?.[matchIndex] ?? null;
}

function renderBracketRounds(bracket: any) {
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
      const p1 = round[matchIndex * 2] ?? '';
      const p2 = round[matchIndex * 2 + 1] ?? '';
      const winner = getWinnerForMatch(roundIndex, matchIndex);

      const isWinnerP1 = winner === p1;
      const isWinnerP2 = winner === p2;

      const getClass = (player: any, isWinner: any) =>
        !player || player === ''
          ? 'btn-looser'
          : isWinner
          ? 'btn-winner'
          : 'btn-looser';

      const match = document.createElement('div');
      match.className = 'relative flex flex-col items-center space-y-1 w-full';

      const box1 = document.createElement('div');
      box1.className = `text-sm text-center px-3 py-2 min-w-[100px] ${getClass(p1, isWinnerP1)}`;

	  box1.innerText = getDisplayName(p1);


      const box2 = document.createElement('div');
      box2.className = `text-sm text-center px-3 py-2 min-w-[100px] ${getClass(p2, isWinnerP2)}`;
		box2.innerText = getDisplayName(p2);
		
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


// Mock

function openSocketFor(userId: number) {
  const existing = socketsByUser[userId];
  if (existing && existing.readyState === WebSocket.OPEN) return existing;

  const ws = new WebSocket(`${API_BASE_URL.replace('https', 'wss')}/ws`);
  socketsByUser[userId] = ws;

  ws.addEventListener('message', onSocketMessage);
  ws.addEventListener('error', (e) => console.log('[ws] error', userId, e));
  ws.addEventListener('close', (e) => console.log('[ws] close', userId, e.code, e.reason));

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ userId, joinOrCreateTournament: true }));
    ws.send(JSON.stringify({ userId, listTournaments: true }));
  });

  return ws;
}


function joinTournament() {
  tournamentState.players = [];
  tournamentState.status = 'waiting';
  renderTournamentStage();

  const JOIN_DELAY = 900;
  const ids = MOCK_USER_IDS;

  let index = 0;
  const interval = setInterval(() => {
    if (index >= ids.length) {
      clearInterval(interval);
      return;
    }

    const uid = ids[index];
    const ws = openSocketFor(uid);

    if (!tournamentState.players.includes(uid)) {
      tournamentState.players.push(uid);
      renderTournamentStage();
    }

    send({ userId: uid, listTournaments: true }, ws);

    index++;
  }, JOIN_DELAY);
}

function joinTournamentFromServer(players: any[]) {
  tournamentState.players = [...players];
  tournamentState.status = 'waiting';
  renderTournamentStage();
}

function startTournamentFromMatches(matches: Array<{player1:any, player2:any}>) {
  const round0: any[] = [];
  matches.forEach(m => { round0.push(m.player1, m.player2); });

  const rounds: any[] = [round0];
  let size = round0.length / 2;
  while (size >= 1) {
    rounds.push(new Array(size).fill(''));
    size = size / 2;
  }

  tournamentState.bracket = rounds;
  tournamentState.status = 'in_progress';
  tournamentState.currentRoundIndex = 0;
  tournamentState.winner = null;
  tournamentState.matchScores = {};
  tournamentState.matchStates = {};
  for (let i = 0; i < rounds[0].length; i += 2) {
    const key = `0-${i / 2}`;
    tournamentState.matchStates[key] = 'waiting';
  }

  renderTournamentStage();
}


const AUTO_RESET_MS = 5000;

function scheduleAutoReturn(delay = AUTO_RESET_MS) {
  if (timersByKey['auto-reset']) {
    clearTimeout(timersByKey['auto-reset']);
    delete timersByKey['auto-reset'];
  }
  timersByKey['auto-reset'] = window.setTimeout(() => {
	  delete timersByKey['auto-reset'];
    resetTournament();
  }, delay);
}

function resetTournament() {
  Object.values(socketsByUser).forEach(ws => {
    try { ws.close(); } catch {   console.log('[ws] close error at Tournament reset'); }
  });
  for (const k in socketsByUser) delete socketsByUser[k];

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
  currentTournamentId = null;
  myMatch = { roomId: null, roundIndex: 0, matchIndex: 0, slot: null, opponent: null };

  renderTournamentStage();
}

function getPreviewRoundIndex(): number {
  const r = tournamentState.currentRoundIndex;
  const prev = Math.max(0, r - 1);

  const prevRound = tournamentState.bracket[prev] || [];
  const prevHasActive = prevRound.some((_: any, idx: any) => {
    if (idx % 2 === 1) return false;
    const key = `${prev}-${idx / 2}`;
    const st = tournamentState.matchStates[key];
    return st !== 'finished' && st !== undefined;
  });

  return prevHasActive ? prev : r;
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
        <div class="mt-4 text-4xl font-bold text-white animate-bounce">${getDisplayName(tournamentState.winner)}</div>
      </div>
    </div>
  `;
  return;
}


  const roundIndex = getPreviewRoundIndex();
  const round = tournamentState.bracket[roundIndex] ?? [];
  const matches = [];

  for (let i = 0; i < round.length; i += 2) {
    const p1 = round[i] ?? '';
    const p2 = round[i + 1] ?? '';
    const key = `${roundIndex}-${i / 2}`;
    const scores = tournamentState.matchScores[key];
    const s1 = scores?.[p1];
    const s2 = scores?.[p2];
    const state = tournamentState.matchStates[key] ?? 'waiting';

    const getScoreSpan = (score: any, isWinner: any) => `
      <span class="${isWinner ? 'text-green-400' : 'text-yellow-400'} font-bold">${score ?? '-'}</span>
    `;

    const statusText =
      state === 'playing'
        ? '<span class="text-blue-400 animate-pulse">Playing...</span>'
        : state === 'finished'
        ? '<span class="text-gray-400">Finished</span>'
        : '<span class="text-gray-500">Waiting</span>';

    matches.push(`
      <div class="border border-[--primary-color] p-3 w-full max-w-[500px] flex justify-between items-center gap-4 overflow-hidden">
        <div class="flex items-center gap-2">
          <span class="btn-looser">${getDisplayName(p1)}</span>
          ${getScoreSpan(s1, s1 > s2)}
        </div>
        <div class="text-sm">${statusText}</div>
        <div class="flex items-center gap-2">
          ${getScoreSpan(s2, s2 > s1)}
          <span class="btn-looser">${getDisplayName(p2)}</span>
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
