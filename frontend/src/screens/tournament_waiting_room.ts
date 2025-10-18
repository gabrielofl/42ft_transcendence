import view from "./tournament_waiting_room.html?raw";
import { createAddPlayerCard } from "./add_player_card";
import { createUserCard } from "./user-card";
import { navigateTo } from "../navigation";
import { PlayerLite, UserData } from "../../../shared/types/messages";
import { API_BASE_URL } from "./config";
import { ClientTournamentSocket } from "../services/tournament-socket";

let cards: { cardElement: HTMLDivElement; cleanup: () => void; fill?: (p: PlayerLite | null) => void }[] = [];
let tournamentPlayers: PlayerLite[] = [];
let tournamentId: number | null = null;
let userId = 0;
let username = "";
let totalSlots = 8;
let isHost = false;
let myReadyState = false; // Track local ready state
let readyButtonRef: HTMLButtonElement | null = null; // Keep a reference to the ready button

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
    readyButtonRef.textContent = myReadyState ? "NOT READY" : "READY";
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

  // 5) WebSocket connection
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
  
  tournamentSocket.UIBroker.Subscribe("TournamentStarting", () => {
    // Torneo iniciando, esperar bracket
  });
  
  tournamentSocket.UIBroker.Subscribe("BracketGenerated", (data) => {
    // Encontrar mi match en el bracket
    const myMatch = data.bracket.matches.find((m: any) =>
      m.player1.userId === userId || m.player2.userId === userId
    );

    if (myMatch) {
      const opponentName = myMatch.player1.userId === userId 
        ? myMatch.player2.username 
        : myMatch.player1.username;

      // Guardar info del match para el ClientGameSocket
      sessionStorage.setItem('tournamentMatchInfo', JSON.stringify({
        tournamentId: data.tournamentId,
        matchId: myMatch.matchId,
        roomId: myMatch.roomId,
        userId: userId, // Guardar userId para el ClientGameSocket
        opponent: myMatch.player1.userId === userId ? myMatch.player2 : myMatch.player1,
        round: data.bracket.roundName,
        isTournament: true
      }));

      // Desconectar del WebSocket de torneos
      tournamentSocket.Disconnect();

      // Navegar a la partida
      alert(`🏆 Your match is starting!\n\nOpponent: ${opponentName}\nRound: ${data.bracket.roundName}`);
      navigateTo('game');
    } else {
      console.error('No se encontró match para este jugador en el bracket');
    }
  });
  
  // Conectar DESPUÉS de suscribir
  tournamentSocket.ConnectToTournament(tournamentId, userId, username);

  // reveal UI
  if (cardsContainer) cardsContainer.style.visibility = "visible";
  const loadingNode = document.getElementById("wait-loading-banner");
  if (loadingNode) loadingNode.remove();
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
