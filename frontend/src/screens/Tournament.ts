import { navigateTo } from '../navigation';
import { renderPreTournamentView, PreMatch } from './pre-tournament-view';
import { avatarImgHTML } from './fallback-avatar';
import { showResultOverlay } from './match-result-view';
import { initProfileModal, setupProfileLinks } from "./ProfileModal";
import { API_BASE_URL } from "./config";

import { ClientWaitRoomSocket } from "./Game/ClientWaitRoomSocket";

let CURRENT_USER_ID: number | null = null;
let CURRENT_USERNAME = "";

const TOURNAMENT_LOBBY_CODE = "TOURNAMENT-LOBBY";

let currentTournamentId: string | null = null;
let myMatch: { roomCode: string | null; roundIndex: number; matchIndex: number; slot: 'player1' | 'player2' | null; opponent: any } =
  { roomCode: null, roundIndex: 0, matchIndex: 0, slot: null, opponent: null };

const UI_DELAY = { assign: 200, toPlaying: 150, toFinished: 200, betweenMatches: 150, nextRound: 300, champion: 0 };
const timersByKey: Record<string, number> = {};
const finishedRooms = new Set<string>(); // dedup "finished" by roomCode

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

let PRE_MODE = false;
function setPreMode(on: boolean) {
  PRE_MODE = on;
  const wr = document.getElementById('waitroom');
  if (!wr) return;

  const playersGrid = wr.querySelector('#players-grid') as HTMLElement | null;
  const readyBar = wr.querySelector('#ready-bar') as HTMLElement | null;
  const waitingTitle = wr.querySelector('#waiting-title') as HTMLElement | null;
  const waitingSubtitle = wr.querySelector('#waiting-subtitle') as HTMLElement | null;

  if (playersGrid) playersGrid.classList.toggle('hidden', on);
  if (readyBar) readyBar.classList.toggle('hidden', on);
  if (waitingTitle) waitingTitle.classList.toggle('hidden', on);
  if (waitingSubtitle) waitingSubtitle.classList.toggle('hidden', on);
}

let IN_GAME_ROOM_CODE: string | null = null;

//must validate??
function beginGameNav(roomCode: string) {
  if (IN_GAME_ROOM_CODE) return;
  IN_GAME_ROOM_CODE = roomCode;
  navigateTo('game');
}

function endGameNav(roomCode: string) {
  if (IN_GAME_ROOM_CODE !== roomCode) return;
  IN_GAME_ROOM_CODE = null;
  navigateTo('tournament');
}

function setMatchState(key: string, next: keyof typeof STATE_ORDER): boolean {
  const curr = (tournamentState.matchStates[key as MatchKey] as keyof typeof STATE_ORDER) ?? 'assigned';
  if (STATE_ORDER[next] >= STATE_ORDER[curr]) {
    tournamentState.matchStates[key as MatchKey] = next;
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

function rememberRoom(roomCode: string, roundIndex: number, matchIndex: number, p1: any, p2: any) {
  roomIndexByCode[roomCode] = { roundIndex, matchIndex, p1, p2 };
}

const MOCK_USER_MAP: Record<number, string> = {
  2: 'David',
  3: 'Miguel',
  4: 'Gabriel',
  5: 'Maria',
  6: 'Grace',
  7: 'Miguel',
  8: 'Juan',
};

const roomIndexByCode: Record<string, { roundIndex: number; matchIndex: number; p1: any; p2: any }> = {};

function keyForRoom(roomCode?: string | null) {
  if (!roomCode) return null;
  const info = roomIndexByCode[roomCode];
  return info ? `${info.roundIndex}-${info.matchIndex}` : null;
}

const MOCK_USER_IDS = Object.keys(MOCK_USER_MAP).map(Number);

function getDisplayName(userOrId: any) {
  if (typeof userOrId === 'number') {
    if (CURRENT_USER_ID != null && userOrId === CURRENT_USER_ID) {
      return CURRENT_USERNAME || `Player${CURRENT_USER_ID}`;
    }
    return (MOCK_USER_MAP[userOrId] ?? `User #${userOrId}`);
  }
  return String(userOrId);
}

type UserId = number;
type PlayerSlot = UserId | null;
type MatchKey = `${number}-${number}`;
type TournamentStatus = 'idle' | 'waiting' | 'in_progress' | 'finished';
type MatchState = 'assigned' | 'waiting' | 'playing' | 'finished';

type Bracket = Array<Array<PlayerSlot>>;
type ScoreMap = Partial<Record<UserId, number>>;

interface TournamentState {
  status: TournamentStatus;
  players: UserId[];
  bracket: Bracket;
  currentRoundIndex: number;
  matchIndex: number;
  winner: UserId | null;

  matchScores: Record<MatchKey, ScoreMap>;
  matchStates: Record<MatchKey, MatchState>;

  roomToKey?: Record<string, MatchKey>;
}

const matchKey = (roundIndex: number, matchIndex: number) =>
  `${roundIndex}-${matchIndex}` as MatchKey;

let tournamentState: TournamentState = {
  status: 'idle',
  players: [],
  bracket: [],
  currentRoundIndex: 0,
  matchIndex: 0,
  winner: null,
  matchScores: {},
  matchStates: {},
  roomToKey: {}
};

function subscribeWaitSocketForMatch(roomCode: string, myUserId: number, myUsername: string) {
  const wait = ClientWaitRoomSocket.GetInstance();

  const isConnected =
    typeof (wait as any).IsConnected === "function"
      ? (wait as any).IsConnected()
      : (wait as any)._connected;

  const currentRoom =
    typeof (wait as any).CurrentRoomCode === "function"
      ? (wait as any).CurrentRoomCode()
      : (wait as any)._roomCode;

  if (isConnected && currentRoom && currentRoom !== roomCode) {
    try { wait.Leave?.(); } catch {}
  }

  wait.UIBroker.Subscribe("RoomState", (_state: any) => {
    const key = keyForRoom(roomCode);
    if (key && tournamentState.matchStates[key as MatchKey] !== 'finished') {
      setMatchState(key, 'waiting');
      renderTournamentStage();
    }
  });

  wait.UIBroker.Subscribe("AllReady", (_msg: any) => {
    const key = keyForRoom(roomCode);
    if (key) {
      setMatchState(key, 'playing');
      renderTournamentStage();
    }
    beginGameNav(roomCode);
  });

  wait.ConnectAndJoin(roomCode, myUserId, myUsername);
}

function leaveWaitSocketIfIn(roomCode: string) {
  const wait = ClientWaitRoomSocket.GetInstance();
  const currentRoom =
    typeof (wait as any).CurrentRoomCode === "function"
      ? (wait as any).CurrentRoomCode()
      : (wait as any)._roomCode;

  if (currentRoom === roomCode) {
    try { wait.Leave?.(); } catch {}
  }
}

function subscribeTournamentChannel() {
  const wait = ClientWaitRoomSocket.GetInstance();

  (wait.UIBroker as any).Subscribe("TournamentMatchAssigned", (m: any) => handleTournamentMessage(m));
  (wait.UIBroker as any).Subscribe("TournamentNextRound", (m: any) => handleTournamentMessage(m));
  (wait.UIBroker as any).Subscribe("TournamentGameStart", (m: any) => handleTournamentMessage(m));
  (wait.UIBroker as any).Subscribe("TournamentScore", (m: any) => handleTournamentMessage(m));
  (wait.UIBroker as any).Subscribe("TournamentMatchFinished", (m: any) => handleTournamentMessage(m));
  (wait.UIBroker as any).Subscribe("TournamentFinished", (m: any) => handleTournamentMessage(m));
}

async function joinTournamentLobby() {
  await ensureIdentity();
  ClientWaitRoomSocket.GetInstance().ConnectAndJoin(TOURNAMENT_LOBBY_CODE, CURRENT_USER_ID!, CURRENT_USERNAME || `Player${CURRENT_USER_ID}`);
}

function handleTournamentMessage(m: any) {
  const t = (m?.type || m?.event || '').toLowerCase();

  const normRoom = (m.roomCode ?? m.roomId ?? m.room ?? null) as string | null;
  const normRound = typeof m.roundIndex === 'number' ? m.roundIndex
                  : typeof m.round === 'number' ? (m.round - 1)
                  : undefined;
  const normMatchIndex = (typeof m.matchIndex === 'number' ? m.matchIndex : undefined);

  if (t.includes('matchassigned')) {
    if (normRoom && typeof normRound === 'number' && typeof normMatchIndex === 'number') {
      rememberRoom(normRoom, normRound, normMatchIndex, m.player1 ?? m.p1 ?? null, m.player2 ?? m.p2 ?? null);
      const key = `${normRound}-${normMatchIndex}` as MatchKey;
      if (!tournamentState.matchStates[key] || tournamentState.matchStates[key] === 'assigned') {
        tournamentState.matchStates[key] = 'waiting';
      }
      renderTournamentStage();
    }
    return;
  }

  if (t.includes('gamestart')) {
    const key = keyForRoom(normRoom);
    if (key) {
      scheduleUIFor(key, () => {
        if (setMatchState(key, 'playing')) renderTournamentStage();
      }, UI_DELAY.toPlaying);
    }
    if (normRoom && normRoom === myMatch.roomCode) {
      beginGameNav(normRoom);
    }
    return;
  }

  if (t.includes('score') || t.includes('playerscored') || t.includes('state')) {
    if (!normRoom) return;
    let key = keyForRoom(normRoom);
    if (!key && myMatch.roomCode === normRoom) key = `${myMatch.roundIndex}-${myMatch.matchIndex}`;
    if (!key) return;

    const info = roomIndexByCode[normRoom]; if (!info) return;
    const { p1, p2 } = info as { p1: PlayerSlot; p2: PlayerSlot };

    const s = (m.scores || {}) as { player1?: number; player2?: number; p1?: number; p2?: number };
    const s1 = s.player1 ?? s.p1 ?? 0;
    const s2 = s.player2 ?? s.p2 ?? 0;

    const scores: ScoreMap = {};
    if (p1 != null) scores[p1] = s1;
    if (p2 != null) scores[p2] = s2;

    tournamentState.matchScores[key as MatchKey] = scores;

    if (tournamentState.matchStates[key as MatchKey] !== 'finished') {
      setMatchState(key, 'playing');
    }
    renderTournamentStage();
    return;
  }

  if (t.includes('gameended') || t.includes('matchfinished')) {
    if (!normRoom) return;
    handleServerMatchFinish({
      roomCode: normRoom,
      tournamentId: m.tournamentId,
      winner: m.winner,
      loser: m.loser,
      scores: m.scores
    });
    return;
  }

  if (t.includes('nextround')) {
    const roundIndex = typeof normRound === 'number' ? normRound : (tournamentState.currentRoundIndex + 1);
    const next = Array.isArray(m.matches) ? m.matches : [];
    const nextFlat: any[] = [];
    next.forEach((mm: any, idx: number) => {
      const rc = mm.roomCode ?? mm.roomId ?? mm.room;
      const p1 = mm.player1 ?? mm.p1 ?? null;
      const p2 = mm.player2 ?? mm.p2 ?? null;
      nextFlat.push(p1, p2);
      if (rc) rememberRoom(rc, roundIndex, idx, p1, p2);
    });

    scheduleUIFor(`round-${roundIndex}`, () => {
      clearRoundVisualQueue(roundIndex - 1);
      tournamentState.bracket[roundIndex] = nextFlat;
      tournamentState.currentRoundIndex = roundIndex;
      renderTournamentStage();
    }, UI_DELAY.nextRound);
    return;
  }

  if (t.includes('tournamentfinished') || t.includes('tournament_finished') || t === 'finished') {
    scheduleUIFor('champion', () => {
      tournamentState.status = 'finished';
      tournamentState.winner = m.winner ?? null;
      renderTournamentStage();
      scheduleAutoReturn();
    });
    return;
  }
}

export function renderTournament() {
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

  initProfileModal();
  setupProfileLinks();

  ensureIdentity().then(async () => {
    subscribeTournamentChannel();
    await joinTournamentLobby();
  }).catch(() => {
  });
}

function setupTournamentButtons() {
  document.getElementById('btn-join')?.addEventListener('click', () => { void joinTournament(); });
  document.getElementById('btn-ready')?.addEventListener('click', () => {
    if (myMatch.roomCode) {
      try { ClientWaitRoomSocket.GetInstance().ToggleReady(); } catch {}
    }
  });
}

function renderTournamentStage() {
  const stage = document.getElementById('tournament-stage');
  if (!stage) return;

  if (PRE_MODE) {
    if (!document.getElementById('waitroom')) {
      stage.innerHTML = renderWaitingRoom(tournamentState.players);
    }
	  setPreMode(true);

    return;
  }

  stage.innerHTML = '';

  if (tournamentState.status === 'idle') {
    stage.innerHTML = `
      <div class="w-full h-full flex items-center justify-center bg-black/40">
        <button id="btn-join" class="bg-[--primary-color] text-white text-xl font-bold px-6 py-3 shadow-lg hover:bg-magenta-600 transition">
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
    <div id="waitroom" class="w-full h-full border border-[--primary-color] p-6 flex flex-col items-center justify-center text-center text-white space-y-6">
      <h1 class="text-[--primary-color] text-3xl font-bold tracking-wide">Welcome to the Tournament</h1>
      <div id="waiting-title" class="text-white text-lg ${PRE_MODE ? 'hidden' : ''}">Waiting room</div>
      <div id="waiting-subtitle" class="text-yellow-300 font-bold text-lg ${PRE_MODE ? 'hidden' : ''}">Waiting to start your match</div>
      <div class="text-sm mt-2">${players.length} / 8 players Ready</div>

      <div id="pre-view" class="w-full max-w-5xl mx-auto"></div>

      <div id="players-grid" class="flex flex-wrap justify-center items-center gap-4 mt-4 ${PRE_MODE ? 'hidden' : ''}">
        ${players.map((p: any, i: any) => {
          const isCurrent = (CURRENT_USER_ID != null) && (p === CURRENT_USER_ID);
          const isReady = i % 2 === 0;
          const symbol = p === 'David' ? '⚡' : isReady ? 'READY' : '';
          const border = isCurrent ? 'border-yellow-500' : 'border-[--primary-color]';

          return `
            <div class="flex items-center gap-4 px-4 py-2 border-2 ${border} shadow-md min-w-[220px]">
              <a href="#" class="open-profile" data-user="${getDisplayName(p)}">${avatarImgHTML(undefined, getDisplayName(p))}</a>
              <div class="flex flex-col items-start text-left">
                <div class="text-white font-bold text-sm"><a href="#" class="open-profile" data-user="${getDisplayName(p)}">${getDisplayName(p).toUpperCase()}</a></div>
                <div class="text-red-700 text-xs">1258 pts</div>
              </div>
              <div class="ml-auto text-white text-xs ">${symbol}</div>
            </div>
          `;
        }).join('')}
      </div>

      <div id="ready-bar" class="flex gap-6 mt-8 ${PRE_MODE ? 'hidden' : ''}">
        <button id="btn-ready" class="bg-yellow-400 text-black px-6 py-2 shadow-lg font-bold text-sm hover:bg-yellow-500">
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

async function joinTournament() {

  try {
    await ensureIdentity();
  } catch {
    alert("Please sign in to join the tournament.");
    navigateTo("create");
    return;
  }

  await joinTournamentLobby();
  subscribeTournamentChannel();

  tournamentState.players = [];
  tournamentState.status = 'waiting';
  renderTournamentStage();

  if (CURRENT_USER_ID != null && !tournamentState.players.includes(CURRENT_USER_ID)) {
    tournamentState.players.push(CURRENT_USER_ID);
    renderTournamentStage();
  }

  const JOIN_DELAY = 900;
  const ids = MOCK_USER_IDS.filter(id => id !== CURRENT_USER_ID);

  let index = 0;
  const interval = setInterval(() => {
    if (index >= ids.length) {
      clearInterval(interval);
      const matches = pairPlayersForRound0(tournamentState.players);
      PRE_MODE = true; renderTournamentStage(); setPreMode(true);

      const pre: PreMatch[] = matches.map(mm => ({ p1: mm.player1, p2: mm.player2 }));
      renderPreTournamentView(pre, {
        mountIn: 'pre-view',
        autoStartMs: 10000,
        getDisplayName,
        onStart: () => {
          setPreMode(false);
          const pv = document.getElementById('pre-view'); if (pv) pv.innerHTML = '';
          startTournamentFromMatches(matches);
          matches.forEach((mm, idx) => {
            const roomCode = `T${idx + 1}ABCD`;
            rememberRoom(roomCode, 0, idx, mm.player1, mm.player2);

            if (CURRENT_USER_ID != null && (mm.player1 === CURRENT_USER_ID || mm.player2 === CURRENT_USER_ID)) {
              myMatch = {
                roomCode,
                roundIndex: 0,
                matchIndex: idx,
                slot: (mm.player1 === CURRENT_USER_ID) ? 'player1' : 'player2',
                opponent: (mm.player1 === CURRENT_USER_ID) ? mm.player2 : mm.player1
              };
              currentUserJoin(roomCode);
            }
          });
        },
      });

      return;
    }

    const uid = ids[index];
    if (!tournamentState.players.includes(uid)) {
      tournamentState.players.push(uid);
      renderTournamentStage();
    }
    index++;
  }, JOIN_DELAY);
}

function pairPlayersForRound0(players: number[]) {
  const list = [...players];
  while (list.length % 2 !== 0) list.push(null as unknown as number); // pad if odd (mock)
  const matches: Array<{ player1: any; player2: any }> = [];
  for (let i = 0; i < list.length; i += 2) {
    matches.push({ player1: list[i], player2: list[i + 1] });
  }
  return matches;
}

async function currentUserJoin(roomCode: string) {
  try {
    await ensureIdentity();
    const myUserId = CURRENT_USER_ID!;
    const myUsername = CURRENT_USERNAME || `Player${myUserId}`;
    subscribeWaitSocketForMatch(roomCode, myUserId, myUsername);
  } catch {
    alert("Could not read your session. Please sign in again.");
  }
}

function startTournamentFromMatches(matches: Array<{ player1: any, player2: any }>) {
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
    tournamentState.matchStates[key as MatchKey] = 'waiting';
  }

  renderTournamentStage();
}

function handleServerMatchFinish(payload: {
  roomCode: string,
  tournamentId?: any,
  winner?: any,
  loser?: any,
  scores?: { player1?: number, player2?: number }
}) {
  if (!payload?.roomCode) return;
  if (finishedRooms.has(payload.roomCode)) return;
  finishedRooms.add(payload.roomCode);

  const key = keyForRoom(payload.roomCode);
  if (!key) return;

  if (timersByKey[key]) {
    clearTimeout(timersByKey[key]);
    delete timersByKey[key];
  }

  const info = roomIndexByCode[payload.roomCode];
  const { roundIndex, matchIndex } = info;
  if (setMatchState(key, 'playing')) {
    renderTournamentStage();
  }

  scheduleUIFor(key, () => {
    const p1 = tournamentState.bracket[roundIndex][matchIndex * 2];
    const p2 = tournamentState.bracket[roundIndex][matchIndex * 2 + 1];
    const s = payload.scores || {};
    tournamentState.matchScores[key as MatchKey] = { [p1 as UserId]: s.player1 ?? 1, [p2 as UserId]: s.player2 ?? 0 };
    setMatchState(key, 'finished');
    renderTournamentStage();
  }, UI_DELAY.toFinished);

  if (payload.roomCode === myMatch.roomCode) {
    const winnerId = payload.winner ?? setMatchWinner(roundIndex, matchIndex);
    const iWon = (CURRENT_USER_ID != null) && (winnerId === CURRENT_USER_ID);

    if (IN_GAME_ROOM_CODE === payload.roomCode) {
      showResultOverlay({
        outcome: iWon ? 'win' : 'lose',
        scope: 'match',
        frameLabel: iWon ? 'Frame 52' : 'Frame 51',
        pointsEarned: iWon ? 150 : 10,
        onContinue: () => {
          endGameNav(payload.roomCode!);
        },
      });
    }
    myMatch = { roomCode: null, roundIndex: 0, matchIndex: 0, slot: null, opponent: null };

    scheduleUIFor(`${key}-promote`, () => {
      const winnerId2 = payload.winner ?? setMatchWinner(roundIndex, matchIndex);
      if (!tournamentState.bracket[roundIndex + 1]) {
        tournamentState.bracket[roundIndex + 1] = new Array(
          Math.ceil((tournamentState.bracket[roundIndex]?.length || 0) / 2)
        ).fill('');
      }
      tournamentState.bracket[roundIndex + 1][matchIndex] = winnerId2;
      renderTournamentStage();

      joinTournamentLobby().catch(() => {});
    }, UI_DELAY.betweenMatches);
  }
}

function setMatchWinner(roundIndex: number, matchIndex: number) {
  const key = `${roundIndex}-${matchIndex}`;
  const round = tournamentState.bracket[roundIndex] || [];
  const p1 = round[matchIndex * 2];
  const p2 = round[matchIndex * 2 + 1];
  const scores = tournamentState.matchScores[key as MatchKey] || {};
  const s1 = scores[p1 as UserId] ?? 1;
  const s2 = scores[p2 as UserId] ?? 0;
  return s1 >= s2 ? p1 : p2;
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
  if (myMatch.roomCode) {
    leaveWaitSocketIfIn(myMatch.roomCode);
  }

  joinTournamentLobby().catch(() => {});

  tournamentState = {
    status: 'idle',
    players: [],
    bracket: [],
    currentRoundIndex: 0,
    matchIndex: 0,
     winner: null,
    matchScores: {},
    matchStates: {},
    roomToKey: {}
  };
  currentTournamentId = null;
  myMatch = { roomCode: null, roundIndex: 0, matchIndex: 0, slot: null, opponent: null };
  IN_GAME_ROOM_CODE = null;
  renderTournamentStage();
}

function getPreviewRoundIndex(): number {
  const r = tournamentState.currentRoundIndex;
  const prev = Math.max(0, r - 1);

  const prevRound = tournamentState.bracket[prev] || [];
  const prevHasActive = prevRound.some((_: any, idx: any) => {
    if (idx % 2 === 1) return false;
    const key = `${prev}-${idx / 2}`;
    const st = tournamentState.matchStates[key as MatchKey];
    return st !== 'finished' && st !== undefined;
  });

  return prevHasActive ? prev : r;
}

function renderMatchPreview() {
  const container = document.getElementById('match-preview');
  if (!container) return;
  container.innerHTML = '';

  if (tournamentState.status === 'finished') {
    showResultOverlay({
      outcome: 'final',
      scope: 'tournament',
      frameLabel: getDisplayName(tournamentState.winner),
      pointsEarned: 1000,
      onContinue: () => {},
    });
    return;
  }

  const roundIndex = getPreviewRoundIndex();
  const round = tournamentState.bracket[roundIndex] ?? [];
  const matches: string[] = [];

  for (let i = 0; i < round.length; i += 2) {
    const p1 = round[i] ?? '';
       const p2 = round[i + 1] ?? '';
    const key = `${roundIndex}-${i / 2}`;
    const scores = tournamentState.matchScores[key as MatchKey];
    const s1 = scores?.[p1 as UserId];
    const s2 = scores?.[p2 as UserId];
    const state = tournamentState.matchStates[key as MatchKey] ?? 'waiting';

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
          ${getScoreSpan(s1, (s1 ?? 0) > (s2 ?? 0))}
        </div>
        <div class="text-sm">${statusText}</div>
        <div class="flex items-center gap-2">
          ${getScoreSpan(s2, (s2 ?? 0) > (s1 ?? 0))}
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

async function ensureIdentity(): Promise<void> {
  if (CURRENT_USER_ID != null) return;
  const res = await fetch(`${API_BASE_URL}/users/session`, { credentials: 'include' });
  const me = await res.json();
  if (!me?.isLoggedIn) throw new Error("not logged in");
  CURRENT_USER_ID = me.userId;
  CURRENT_USERNAME = me.username ?? me.email ?? `Player${CURRENT_USER_ID}`;
}
