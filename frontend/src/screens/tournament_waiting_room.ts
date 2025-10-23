import view from "./tournament_waiting_room.html?raw";
import { createAddPlayerCard } from "./add_player_card";
import { createUserCard } from "./user-card";
import { navigateTo } from "../navigation";
import { PlayerLite, UserData } from "../../../shared/types/messages";
import { API_BASE_URL } from "./config";
import { ClientTournamentSocket } from "../services/tournament-socket";
import { BracketViewer } from "./Game/BracketViewer";
import { showResultOverlay } from "./match-result-view";

let cards: { cardElement: HTMLDivElement; cleanup: () => void; fill?: (p: PlayerLite | null) => void }[] = [];
let tournamentPlayers: PlayerLite[] = [];
let tournamentId: number | null = null;
let userId = 0;
let username = "";
let totalSlots = 8;
let isHost = false;
let myReadyState = false; // Track local ready state
let readyButtonRef: HTMLButtonElement | null = null; // Keep a reference to the ready button

// Bracket and notifications
let bracketViewer: BracketViewer | null = null;
let isBracketVisible = false;
let myCurrentMatch: any = null; // Info del match actual del usuario

export let localPlayersUserName: [number, string][] = [];

// ---------- utilities ----------
async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

function selectButtonByText(txt: string): HTMLButtonElement | null {
  const all = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const want = txt.trim().toUpperCase();
  return all.find(b => (b.textContent || "").trim().toUpperCase() === want) || null;
}

function setReadyCounter(ready: number, total: number) {
  const el = document.getElementById("ready-counter");
  if (el) el.textContent = `${ready} / ${total} players Ready`;
}

function setTournamentIdText(id: number | null) {
  const el = document.getElementById("tournament-id");
  if (el) el.textContent = id ? `#${id}` : "—";
}

function setTournamentName(name: string) {
  const el = document.getElementById("tournament-name");
  if (el) el.textContent = name || "Loading tournament...";
}

function updateReadyButton() {
  if (readyButtonRef) {
    // Verificar si el torneo está en progreso
    const tournamentMatchInfo = sessionStorage.getItem('tournamentMatchInfo');
    const isTournamentInProgress = tournamentMatchInfo !== null;
    
    if (isTournamentInProgress) {
      // Deshabilitar el botón cuando el torneo está en progreso
      readyButtonRef.disabled = true;
      readyButtonRef.textContent = "TOURNAMENT IN PROGRESS";
      readyButtonRef.style.opacity = "0.5";
      readyButtonRef.style.cursor = "not-allowed";
    } else {
      // Habilitar el botón cuando el torneo está en waiting
      readyButtonRef.disabled = false;
      readyButtonRef.textContent = myReadyState ? "NOT READY" : "READY";
      readyButtonRef.style.opacity = "1";
      readyButtonRef.style.cursor = "pointer";
    }
  }
}

function getTournamentIdFromURL(): number | null {
  try {
    const u = new URL(location.href);
    const id = u.searchParams.get("tournament");
    return id ? parseInt(id, 10) : null;
  } catch { return null; }
}

function getTournamentIdFromStorage(): number | null {
  try {
    const stored = sessionStorage.getItem("currentTournamentId");
    return stored ? parseInt(stored, 10) : null;
  } catch { return null; }
}

function setTournamentIdInStorage(id: number | null) {
  try {
    if (id) sessionStorage.setItem("currentTournamentId", String(id));
    else sessionStorage.removeItem("currentTournamentId");
  } catch {}
}

function replaceTournamentIdInURL(id: number | null) {
  const url = new URL(location.href);
  if (id) url.searchParams.set("tournament", String(id));
  else url.searchParams.delete("tournament");
  window.history.replaceState(null, "", url.toString());
}

// ---------- bracket and notifications ----------

// Helper: Guardar info del match en sessionStorage
async function saveMatchInfo(tournamentId: number, match: any, roundName: string) {
  try {
    const tournamentConfig = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}`, {
      credentials: 'include'
    });
    const config = await tournamentConfig.json();
    
    sessionStorage.setItem('tournamentMatchInfo', JSON.stringify({
      tournamentId,
      matchId: match.matchId,
      roomId: match.roomId,
      userId: userId,
      username: username,
      opponent: match.player1.userId === userId ? match.player2 : match.player1,
      player1: match.player1,
      player2: match.player2,
      round: roundName,
      mapKey: config.map_key || 'ObstacleMap',
      isTournament: true
    }));
  } catch (error) {
    console.error('Error obteniendo configuración del torneo:', error);
    // Fallback con configuración por defecto
    sessionStorage.setItem('tournamentMatchInfo', JSON.stringify({
      tournamentId,
      matchId: match.matchId,
      roomId: match.roomId,
      userId: userId,
      username: username,
      opponent: match.player1.userId === userId ? match.player2 : match.player1,
      player1: match.player1,
      player2: match.player2,
      round: roundName,
      mapKey: 'ObstacleMap',
      isTournament: true
    }));
  }
}

function showBracket() {
  const waitingSection = document.getElementById("waiting-room-section");
  const bracketSection = document.getElementById("bracket-section");
  
  if (waitingSection) waitingSection.classList.add("hidden");
  if (bracketSection) bracketSection.classList.remove("hidden");
  
  isBracketVisible = true;
  
  // Actualizar el botón ready cuando se muestra el bracket
  updateReadyButton();
}

function hideBracket() {
  const waitingSection = document.getElementById("waiting-room-section");
  const bracketSection = document.getElementById("bracket-section");
  
  if (waitingSection) waitingSection.classList.remove("hidden");
  if (bracketSection) bracketSection.classList.add("hidden");
  
  isBracketVisible = false;
  
  // Actualizar el botón ready cuando se oculta el bracket
  updateReadyButton();
}

// function showNotification(message: string, type: 'info' | 'success' | 'warning' = 'info') {
//   // Crear notificación temporal
//   const notification = document.createElement('div');
//   notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
//     type === 'success' ? 'bg-green-600 text-white' :
//     type === 'warning' ? 'bg-yellow-600 text-white' :
//     'bg-blue-600 text-white'
//   }`;
//   notification.textContent = message;
  
//   document.body.appendChild(notification);
  
//   // Auto-remover después de 5 segundos
//   setTimeout(() => {
//     if (notification.parentNode) {
//       notification.parentNode.removeChild(notification);
//     }
//   }, 5000);
// }

function initializeBracketViewer() {
  // SIEMPRE limpiar el bracketViewer anterior para evitar estado residual
  if (bracketViewer) {
    bracketViewer.dispose();
    bracketViewer = null;
  }
  
  // Crear un nuevo BracketViewer completamente limpio
  bracketViewer = new BracketViewer('tournament-bracket-container');
  
  // Conectar el MessageBroker del tournament-socket con el BracketViewer
  const tournamentSocket = ClientTournamentSocket.GetInstance();
  
  // Re-enviar eventos del tournament-socket al BracketViewer
  tournamentSocket.UIBroker.Subscribe("BracketGenerated", (data) => {
    bracketViewer?.messageBroker.Publish("BracketGenerated", data);
  });
  
  tournamentSocket.UIBroker.Subscribe("BracketUpdated", (data) => {
    bracketViewer?.messageBroker.Publish("BracketUpdated", data);
  });
  
  tournamentSocket.UIBroker.Subscribe("BracketMatchCompleted", (data) => {
    bracketViewer?.messageBroker.Publish("BracketMatchCompleted", data);
  });
  
  tournamentSocket.UIBroker.Subscribe("BracketRoundAdvanced", (data) => {
    bracketViewer?.messageBroker.Publish("BracketRoundAdvanced", data);
  });
  
  tournamentSocket.UIBroker.Subscribe("BracketTournamentFinished", (data) => {
    bracketViewer?.messageBroker.Publish("BracketTournamentFinished", data);
  });
}

function cleanupTournamentState() {
  // Limpiar estado del torneo actual
  sessionStorage.removeItem('tournamentMatchInfo');
  sessionStorage.removeItem('pendingCountdown');
  
  // Limpiar variables globales
  myCurrentMatch = null;
  lastProcessedEvent = null;
  
  // Limpiar countdown si está activo
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  // Limpiar BracketViewer completamente
  if (bracketViewer) {
    bracketViewer.dispose();
    bracketViewer = null;
  }
  
  // Limpiar MessageBroker del socket para evitar eventos residuales
  const tournamentSocket = ClientTournamentSocket.GetInstance();
  tournamentSocket.UIBroker.ClearAll();
}

function resetTournamentSocket() {
  // Reiniciar completamente el singleton del socket
  const tournamentSocket = ClientTournamentSocket.GetInstance();
  tournamentSocket.Disconnect();
  tournamentSocket.UIBroker.ClearAll();
  
  // Resetear el singleton usando reflection
  (ClientTournamentSocket as any).instance = null;
}

function updateMatchInfo() {
  const matchInfoEl = document.getElementById('match-info');
  
  if (!matchInfoEl) return;
  
  if (myCurrentMatch) {
    const opponentName = myCurrentMatch.player1.userId === userId 
      ? myCurrentMatch.player2.username 
      : myCurrentMatch.player1.username;
    
    matchInfoEl.innerHTML = `
      <div class="text-lg font-bold text-[--primary-color]">Your Next Match</div>
      <div class="text-sm text-gray-300">vs ${opponentName}</div>
      <div class="text-xs text-gray-400">Match ${myCurrentMatch.matchId}</div>
    `;
  } else {
    matchInfoEl.innerHTML = `
      <div class="text-lg font-bold text-[--primary-color]">Tournament Bracket</div>
      <div class="text-sm text-gray-300">Waiting for next round...</div>
    `;
  }
}

// Nueva función para la cuenta atrás
let countdownInterval: number | null = null;
let lastProcessedEvent: string | null = null; // Para evitar eventos duplicados

function startCountdown(seconds: number, onComplete: () => void) {
  const countdownSection = document.getElementById('countdown-section');
  const countdownTimer = document.getElementById('countdown-timer');
  const waitingMessage = document.getElementById('waiting-message');
  
  if (!countdownSection || !countdownTimer) {
    console.error('Error: Countdown elements not found in DOM');
    return;
  }
  
  // Ocultar mensaje de espera
  if (waitingMessage) waitingMessage.classList.add('hidden');
  
  // Mostrar countdown
  countdownSection.classList.remove('hidden');
  
  let remaining = seconds;
  countdownTimer.textContent = remaining.toString();
  
  // Limpiar interval anterior si existe
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  countdownInterval = window.setInterval(() => {
    remaining--;
    countdownTimer.textContent = remaining.toString();
    
    if (remaining <= 0) {
      if (countdownInterval) clearInterval(countdownInterval);
      countdownSection.classList.add('hidden');
      onComplete();
    }
  }, 1000);
}

function showWaitingMessage() {
  const countdownSection = document.getElementById('countdown-section');
  const waitingMessage = document.getElementById('waiting-message');
  
  if (countdownSection) countdownSection.classList.add('hidden');
  if (waitingMessage) waitingMessage.classList.remove('hidden');
}

// ---------- main render ----------
export async function renderWaitingRoom(): Promise<void> {
  const main = document.getElementById("main");
  if (!main) return;

  main.innerHTML = view;

  // loading banner inside cards container
  const cardsContainer = document.getElementById("player-cards-container") as HTMLDivElement | null;
  if (cardsContainer) {
    cardsContainer.style.position = "relative";
    cardsContainer.style.visibility = "hidden";
    const loading = document.createElement("div");
    loading.id = "wait-loading-banner";
    loading.textContent = "Loading tournament…";
    loading.setAttribute("style", `
      position: absolute; inset: 0; display: grid; place-items: center;
      font-weight: 600; opacity: 0.9;
    `);
    cardsContainer.appendChild(loading);
  }

  // 1) Session
  const me = await fetchJSON(`${API_BASE_URL}/users/session`, { credentials: "include" });
  if (!me?.isLoggedIn) {
    alert("Please sign in to join a tournament.");
    navigateTo("tournament-selection");
    return;
  }
  userId = me.userId;
  username = me.username ?? me.email ?? `Player${userId}`;

  // 2) Resolve tournament: sessionStorage > URL (priorizar lo más reciente)
  const urlTournamentId = getTournamentIdFromURL();
  const storedTournamentId = getTournamentIdFromStorage();
  
  // Priorizar sessionStorage (más reciente) sobre URL (puede ser viejo)
  tournamentId = storedTournamentId || urlTournamentId;
  
  if (!tournamentId) {
    alert("No tournament ID found. Please create or join a tournament first.");
    navigateTo("tournament-lobby");
    return;
  }

  // Sync URL and storage
  setTournamentIdInStorage(tournamentId);
  replaceTournamentIdInURL(tournamentId);
  setTournamentIdText(tournamentId);

  // 3) Fetch tournament details
  const tournament = await fetchJSON(`${API_BASE_URL}/tournaments/${tournamentId}`, { 
    credentials: "include" 
  });
  
  if (!tournament) {
    // Limpiar storage corrupto
    sessionStorage.removeItem('currentTournamentId');
    
    // Limpiar URL
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('tournament');
    window.history.replaceState(null, '', cleanUrl.toString());
    
    alert("Tournament not found or has been deleted.");
    navigateTo("tournament-lobby");
    return;
  }
  
  setTournamentName(tournament.name);
  isHost = tournament.creator_id === userId;
  tournamentPlayers = tournament.players || [];
  totalSlots = tournament.max_players || 8;

  buildSlots(totalSlots);
  renderPlayers();

  // 4) Top controls
  readyButtonRef = selectButtonByText("READY"); // Save reference
  const shareBtn = selectButtonByText("SHARE");

  readyButtonRef?.addEventListener("click", () => {
    myReadyState = !myReadyState;
    updateReadyButton();
    ClientTournamentSocket.GetInstance().ToggleReady();
  });

  shareBtn?.addEventListener("click", async () => {
    if (!tournamentId) { 
      alert("Tournament ID not assigned yet."); 
      return; 
    }
    const url = `${location.origin}${location.pathname}?tournament=${tournamentId}`;
    try { 
      await navigator.clipboard.writeText(url); 
    } catch {}
    alert("Tournament link copied!");
  });

  // 5) Initialize Bracket Viewer
  initializeBracketViewer();

  // 6) WebSocket connection
  const tournamentSocket = ClientTournamentSocket.GetInstance();
  
  // IMPORTANTE: Suscribir ANTES de conectar para no perder mensajes
  tournamentSocket.UIBroker.Subscribe("TournamentState", (state) => {
    applyTournamentState(state);
  });
  
  tournamentSocket.UIBroker.Subscribe("PlayerJoined", (p) => {
    upsertPlayer(p);
    renderPlayers();
  });
  
  tournamentSocket.UIBroker.Subscribe("PlayerLeft", ({ userId: uid }) => {
    tournamentPlayers = tournamentPlayers.filter(p => p.userId !== uid);
    renderPlayers();
  });
  
  tournamentSocket.UIBroker.Subscribe("NewHost", ({ userId: uid }) => {
    // Actualizar quién es el host
    tournamentPlayers.forEach(p => {
      p.isHost = p.userId === uid;
    });
    isHost = uid === userId;
    renderPlayers();
  });
  
  tournamentSocket.UIBroker.Subscribe("PlayerReady", ({ userId: uid }) => {
    setPlayerReady(uid, true);
    if (uid === userId) {
      myReadyState = true;
      updateReadyButton();
    }
    renderPlayers();
  });
  
  tournamentSocket.UIBroker.Subscribe("PlayerUnready", ({ userId: uid }) => {
    setPlayerReady(uid, false);
    if (uid === userId) {
      myReadyState = false;
      updateReadyButton();
    }
    renderPlayers();
  });
  tournamentSocket.UIBroker.Subscribe("BracketGenerated", async (data) => {
    
    // Encontrar mi match en el bracket
    const myMatch = data.bracket.matches.find((m: any) =>
      m.player1.userId === userId || m.player2.userId === userId
    );

    if (myMatch) {
      myCurrentMatch = myMatch;
      await saveMatchInfo(data.tournamentId, myMatch, data.bracket.roundName);

      // Mostrar bracket
      showBracket();
      updateMatchInfo();
      
      // Iniciar cuenta atrás de 10 segundos para el primer match
      startCountdown(10, async () => {
        // 1. Primero navegar al juego (se conecta a /gamews)
        navigateTo('game');
        
        // 2. Esperar un momento para que se conecte
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 3. LUEGO enviar señal para iniciar el match
        const tournamentSocket = ClientTournamentSocket.GetInstance();
        tournamentSocket.Send({ 
          type: 'TournamentMatchStart', 
          roomId: myMatch.roomId 
        });
      });
    } else {
      console.error('No se encontró match para este jugador en el bracket');
    }
  });

  // Listeners para eventos de bracket

  tournamentSocket.UIBroker.Subscribe("BracketMatchCompleted", (data) => {
    // El BracketViewer ya actualiza visualmente el bracket
    // Solo necesitamos verificar si era nuestro match
    if (myCurrentMatch && myCurrentMatch.matchId === data.matchId) {
      // Mostrar mensaje de espera
      showWaitingMessage();
      // Resetear myCurrentMatch para esperar el siguiente
      myCurrentMatch = null;
    }
  });

  tournamentSocket.UIBroker.Subscribe("BracketRoundAdvanced", async (data) => {
    // Crear un ID único para este evento
    const eventId = `${data.tournamentId}-${data.roundNumber}-${data.matches.length}`;
    
    // Evitar procesar eventos duplicados
    if (lastProcessedEvent === eventId) {
      return;
    }
    
    lastProcessedEvent = eventId;
    
    // Verificar si tengo un nuevo match en esta ronda
    const myNewMatch = data.matches.find((m: any) =>
      m.player1.userId === userId || m.player2.userId === userId
    );

    if (myNewMatch) {
      myCurrentMatch = myNewMatch;
      await saveMatchInfo(data.tournamentId, myNewMatch, data.roundName);

      // Actualizar UI para mostrar el nuevo match
      updateMatchInfo();
      
      // Asegurar que el bracket esté visible
      showBracket();
      
      // Verificar si ya estamos en tournament-waiting antes de iniciar countdown
      // Si estamos en otra pantalla (ej: game), esperar a que volvamos
      const currentScreen = window.location.hash.replace('#', '');
      
      if (currentScreen === 'tournament-waiting') {
        startCountdown(10, async () => {
          navigateTo('game');
          await new Promise(resolve => setTimeout(resolve, 1000));
          const tournamentSocket = ClientTournamentSocket.GetInstance();
          tournamentSocket.Send({ type: 'TournamentMatchStart', roomId: myNewMatch.roomId });
        });
      } else {
        // Guardar que hay un countdown pendiente
        sessionStorage.setItem('pendingCountdown', 'true');
      }
    } else {
      // Mostrar mensaje de espera
      showWaitingMessage();
    }
  });

  tournamentSocket.UIBroker.Subscribe("BracketTournamentFinished", (data) => {
    // Ocultar countdown si está activo
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    const countdownSection = document.getElementById('countdown-section');
    if (countdownSection) countdownSection.classList.add('hidden');
    
    // Ocultar mensaje de espera si está visible
    const waitingMessage = document.getElementById('waiting-message');
    if (waitingMessage) waitingMessage.classList.add('hidden');
    
    // Mostrar pantalla de resultado con trofeo grande
    const isWinner = data.winner.userId === userId;
    
    showResultOverlay({
      outcome: isWinner ? 'final' : 'lose',
      scope: 'tournament',
      mountIn: 'main',
      frameLabel: 'Champion',
      winnerName: data.winner.username,
      onContinue: () => {
        // SOLUCIÓN SIMPLE: Navegar directamente al lobby sin limpiar nada
        // El lobby se encargará de limpiar todo
        navigateTo('tournament-lobby');
      }
    });
  });
  
  // Conectar DESPUÉS de suscribir
  tournamentSocket.ConnectToTournament(tournamentId, userId, username);

  // reveal UI
  if (cardsContainer) cardsContainer.style.visibility = "visible";
  const loadingNode = document.getElementById("wait-loading-banner");
  if (loadingNode) loadingNode.remove();
  
  // Si hay información de match en sessionStorage, mostrar el bracket
  // Si hay información de match en sessionStorage, mostrar el bracket
  const tournamentMatchInfo = sessionStorage.getItem('tournamentMatchInfo');
  if (tournamentMatchInfo) {
    showBracket();
    
    // Verificar si hay un countdown pendiente de iniciar
    const hasPendingCountdown = sessionStorage.getItem('pendingCountdown');
    if (hasPendingCountdown === 'true') {
      sessionStorage.removeItem('pendingCountdown');
      const matchInfo = JSON.parse(tournamentMatchInfo);
      
      // Usar setTimeout para asegurar que el DOM esté listo
      setTimeout(() => {
        startCountdown(10, async () => {
          navigateTo('game');
          await new Promise(resolve => setTimeout(resolve, 1000));
          const tournamentSocket = ClientTournamentSocket.GetInstance();
          tournamentSocket.Send({ type: 'TournamentMatchStart', roomId: matchInfo.roomId });
        });
      }, 100);
    }
    
    // Obtener el bracket actualizado del backend para mostrar el estado actual
    try {
      const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}`, {
        credentials: 'include'
      });
      const tournamentData = await response.json();
      
      if (tournamentData.bracket) {
        const bracket = typeof tournamentData.bracket === 'string' 
          ? JSON.parse(tournamentData.bracket) 
          : tournamentData.bracket;
        
        // Convertir TODAS las rondas del bracket
        const allRounds = bracket.rounds.map((round: any, index: number) => ({
          name: round.name,
          matches: round.matches.map((match: any) => ({
            matchId: match.matchId,
            roomId: `tournament-${tournamentId}-match-${match.matchId}`,
            player1: match.player1,
            player2: match.player2,
            winner: match.winner || null,
            status: match.status || 'pending'
          }))
        }));
        
        // Publicar TODAS las rondas al BracketViewer
        bracketViewer?.messageBroker.Publish("BracketFullState", {
          tournamentId: tournamentId,
          currentRound: bracket.currentRound || 0,
          rounds: allRounds,
          status: bracket.status || 'in_progress'
        });
      }
    } catch (error) {
      console.error('❌ Error obteniendo bracket del backend:', error);
    }
  }
}

// ---------- UI construction (cards driven by tournamentPlayers) ----------
function buildSlots(n: number) {
  const container = document.getElementById("player-cards-container");
  if (!container) { return; }

  for (const c of cards) c.cleanup?.();
  cards = [];
  container.innerHTML = "";

  for (let i = 0; i < n; i++) {
    const card = createAddPlayerCard({
      onAddLocal: () => {},
      onAddAI: () => {
        const socket = ClientTournamentSocket.GetInstance();
        socket.InviteAI();
      },
    });

    // Ocultar botón de local player en torneos
    const localPlayerBtn = card.cardElement.querySelector("#add-local-player");
    if (localPlayerBtn) {
      (localPlayerBtn as HTMLElement).style.display = "none";
    }

    cards.push(card as any);
    container.appendChild(card.cardElement);
  }
  
  // Después de crear todos los cards, agregar la función fill
  for (let i = 0; i < cards.length; i++) {
    const cardIndex = i; // Capturar i en closure
    
    (cards[i] as any).fill = (p: PlayerLite | null) => {
      const currentCard = cards[cardIndex];
      const el = currentCard.cardElement;
      
      if (!p) {
        // Slot vacío - reconstruir card de "Add Player"
        el.dataset.empty = "true";
        el.dataset.userid = "";
        
        // Crear nuevo card con listeners frescos
        const newCard = createAddPlayerCard({
          onAddLocal: () => {},
          onAddAI: () => {
            const socket = ClientTournamentSocket.GetInstance();
            socket.InviteAI();
          }
        });
        
        // Reemplazar en el DOM
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(newCard.cardElement, el);
          
          // Actualizar referencia
          cards[cardIndex].cardElement = newCard.cardElement;
          cards[cardIndex].cleanup = newCard.cleanup;
          
          // Ocultar botón de local player
          const localBtn = newCard.cardElement.querySelector("#add-local-player");
          if (localBtn) (localBtn as HTMLElement).style.display = "none";
        }
      } else {
        // Slot con jugador
        el.dataset.empty = "false";
        el.innerHTML = createUserCard(playerLiteToUserData(p));
        el.dataset.userid = String(p.userId);
      }
    };
  }
}

function renderPlayers() {
  if (totalSlots <= 0) return;

  const ordered = [...tournamentPlayers].sort((a, b) =>
    (Number(b.isHost) - Number(a.isHost)) ||
    (Number(b.ready) - Number(a.ready)) ||
    (a.username || "").localeCompare(b.username || "") ||
    (a.userId - b.userId)
  );

  for (let i = 0; i < totalSlots; i++) {
    const target = ordered[i] ?? null;
    (cards[i] as any)?.fill?.(target);
  }

  const readyCount = tournamentPlayers.filter(p => p.ready).length;
  setReadyCounter(readyCount, totalSlots);
}

// ---------- server state integration ----------
function upsertPlayer(p: PlayerLite) {
  const i = tournamentPlayers.findIndex(x => x.userId === p.userId);
  if (i >= 0) tournamentPlayers[i] = { ...tournamentPlayers[i], ...p };
  else tournamentPlayers.push(p);
}

function setPlayerReady(uid: number, ready: boolean) {
  const i = tournamentPlayers.findIndex(x => x.userId === uid);
  if (i >= 0) tournamentPlayers[i] = { ...tournamentPlayers[i], ready };
}

function applyTournamentState(state: any) {
  if (state.id) tournamentId = state.id;
  if (state.name) setTournamentName(state.name);
  
  const slotsFromServer = state.max_players || totalSlots;
  if (slotsFromServer !== totalSlots) {
    totalSlots = slotsFromServer;
    buildSlots(totalSlots);
  }

  tournamentPlayers = [...(state.players || [])];
  
  // Update local ready state from server
  const myPlayer = tournamentPlayers.find(p => p.userId === userId);
  if (myPlayer) {
    myReadyState = myPlayer.ready || false;
    updateReadyButton();
  }
  
  renderPlayers();

  const container = document.getElementById("player-cards-container") as HTMLDivElement | null;
  if (container) container.style.visibility = "visible";
  const loadingNode = document.getElementById("wait-loading-banner");
  if (loadingNode) loadingNode.remove();
}

// ---------- transforms & payload ----------
function playerLiteToUserData(p: PlayerLite): UserData {
  return { 
    id: p.userId, 
    username: p.username, 
    avatar: undefined, 
    status: 1, 
    score: 0 
  } as unknown as UserData;
}
