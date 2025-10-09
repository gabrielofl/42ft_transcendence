// waiting-room.ts
import view from "./waiting_room.html?raw";
import userCard from "./user-card.html?raw";
import { ClientWaitRoomSocket } from "./Game/ClientWaitRoomSocket";
import { ClientGameSocket } from "./Game/ClientGameSocket";
import { SelectedMap } from "./Game/map-selection";
import { createAddPlayerCard } from "./add_player_card";
import { navigateTo } from "../navigation";
import { WaitPayloads, PlayerLite, RoomStatePayload } from "../../../shared/types/messages";

let cards: { cardElement: HTMLDivElement; cleanup: () => void; fill?: (p: PlayerLite|null)=>void }[] = [];
let currentPlayers: PlayerLite[] = [];
let roomCode = "";
let userId = 0;
let username = "";

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

export let localPlayersUserName: [number, string][] = []; // consumed by your game screen after AllReady

export async function renderWaitingRoom(): Promise<void> {
  const main = document.getElementById("main");
  if (!main) return;

  main.innerHTML = view;

	const me = await fetchJSON('/api/session', { credentials: 'include' });
  if (!me?.isLoggedIn) {
    alert('Please sign in to join a room.');
    navigateTo('create'); // back to map selection
    return;
  }
  userId = me.userId;
  username = me.username ?? me.email ?? `Player${userId}`;

  // roomCode from create step
  roomCode = sessionStorage.getItem("roomCode") || new URL(location.href).searchParams.get("room") || "ABC123";

  // 1) Build empty slots
  const container = document.getElementById("player-cards-container");
  cards = [];
  for (let i = 0; i < SelectedMap.spots.length; i++) {
    const card = createAddPlayerCard(); // assume returns DOM + cleanup; extend to accept fill function
    // small enhancer: add fill function to replace placeholder with userCard
    (card as any).fill = (p: PlayerLite | null) => {
      const el = card.cardElement;
      if (!p) {
        el.innerHTML = `<div class="text-gray-400 italic">Empty slot</div>`;
        return;
      }
      el.innerHTML = userCard
        .replaceAll("{{username}}", p.username)
        .replaceAll("{{readyClass}}", p.ready ? "text-green-400" : "text-yellow-300")
        .replaceAll("{{roleBadge}}", p.isHost ? "HOST" : "");
    };
    cards.push(card as any);
    container?.appendChild(card.cardElement);
  }

  // 2) Wire controls
  const readyBtn = document.querySelector<HTMLButtonElement>("button.btn-primary.bg-yellow-400");
  const backBtn  = document.querySelectorAll<HTMLButtonElement>("button.btn-primary.bg-pink-500")[0];
  const shareBtn = document.querySelectorAll<HTMLButtonElement>("button.btn-primary.bg-pink-500")[1];
  const roomBox  = document.querySelector<HTMLSpanElement>("span.block.text-yellow-300");

  // If room code comes via URL/state, set it
  roomCode = roomCode || (sessionStorage.getItem("roomCode") ?? "ABC123");
  if (roomBox) roomBox.textContent = prettyRoom(roomCode);

  readyBtn?.addEventListener("click", () => ClientWaitRoomSocket.GetInstance().ToggleReady());
  backBtn?.addEventListener("click", () => {
    ClientWaitRoomSocket.GetInstance().Leave();
    navigateTo("create"); // or your main menu
  });
  shareBtn?.addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(roomCode)}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    alert("Room link copied!");
  });

  // 3) Subscribe to wait-socket events
	const wait = ClientWaitRoomSocket.GetInstance();

  wait.UIBroker.Subscribe("RoomState", (state) => applyRoomState(state));
  wait.UIBroker.Subscribe("AddPlayer", (p) => {
    upsertPlayer(p);
    renderPlayers();
  });
  wait.UIBroker.Subscribe("RemovePlayer", ({ userId }) => {
    currentPlayers = currentPlayers.filter(p => p.userId !== userId);
    renderPlayers();
  });
  wait.UIBroker.Subscribe("PlayerReady", ({ userId }) => {
    setReady(userId, true); renderPlayers();
  });
  wait.UIBroker.Subscribe("PlayerUnready", ({ userId }) => {
    setReady(userId, false); renderPlayers();
  });
  wait.UIBroker.Subscribe("SetHost", ({ userId }) => {
    currentPlayers = currentPlayers.map(p => ({ ...p, isHost: p.userId === userId }));
    renderPlayers();
  });
  wait.UIBroker.Subscribe("SetRoomCode", ({ roomCode: rc }) => {
    roomCode = rc; if (roomBox) roomBox.textContent = prettyRoom(rc);
  });
  wait.UIBroker.Subscribe("Error", ({ message }) => alert(message));

  // Transition to game
  wait.UIBroker.Subscribe("AllReady", ({ players }) => {
    // Provide the (id, username) mapping your game screen expects:
    localPlayersUserName = players.map(p => [p.userId, p.username]) as [number, string][];
    navigateTo("game");
    // boot the gameplay socket + canvas
    ClientGameSocket.Canvas = document.getElementById("pong-canvas") as HTMLCanvasElement;
    ClientGameSocket.GetInstance().CreateGame();
  });

  // 4) Connect & join the room
  wait.ConnectAndJoin(roomCode, userId, username);
}

// ---------- helpers ----------
function prettyRoom(code: string) {
  return code.toUpperCase().replace(/(.{3})/g, "$1 ").trim();
}

function upsertPlayer(p: PlayerLite) {
  const i = currentPlayers.findIndex(x => x.userId === p.userId);
  if (i >= 0) currentPlayers[i] = { ...currentPlayers[i], ...p };
  else currentPlayers.push(p);
}

function setReady(uid: number, ready: boolean) {
  const i = currentPlayers.findIndex(x => x.userId === uid);
  if (i >= 0) currentPlayers[i] = { ...currentPlayers[i], ready };
}

function applyRoomState(state: RoomStatePayload) {
  currentPlayers = [...state.players];
  const roomBox = document.querySelector<HTMLSpanElement>("span.block.text-yellow-300");
  if (roomBox) roomBox.textContent = prettyRoom(state.roomCode);
  renderPlayers();
}

function renderPlayers() {
  // fill the N cards with players or empty
  for (let i = 0; i < cards.length; i++) {
    const player = currentPlayers[i] ?? null;
    (cards[i] as any).fill?.(player);
  }

  // "2 / 2 players Ready" label
  const status = document.querySelector<HTMLParagraphElement>("p.text-xs.text-[--secondary-color]");
  if (status) {
    const readyCount = currentPlayers.filter(p => p.ready).length;
    const total = currentPlayers.length;
    status.textContent = `${readyCount} / ${SelectedMap.spots.length} players Ready`;
  }
}
