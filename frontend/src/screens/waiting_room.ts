import view from "./waiting_room.html?raw";
import { ClientWaitRoomSocket } from "./Game/ClientWaitRoomSocket";
import { ClientGameSocket } from "./Game/ClientGameSocket";
import { createAddPlayerCard } from "./add_player_card";
import { createUserCard } from "./user-card";
import { navigateTo } from "../navigation";
import { PlayerLite, RoomStatePayload, UserData } from "@shared/types/messages";
const API_BASE_URL = import.meta.env.VITE_BASE_URL_API;
import {  setupAlert } from "./AlertModal.js";
import { fetchJSON } from "./utils";

let cards: { cardElement: HTMLDivElement; cleanup: () => void; fill?: (p: PlayerLite | null) => void }[] = [];
let serverPlayers: PlayerLite[] = [];
let roomCode = "";
let userId = 0;
let username = "";
let totalSlots = 0;

export let localPlayersUserName: [number, string][] = [];

// ---------- utilities ----------

function selectButtonByText(txt: string): HTMLButtonElement | null {
  const all = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const want = txt.trim().toUpperCase();
  return all.find(b => (b.textContent || "").trim().toUpperCase() === want) || null;
}

function setReadyCounter(ready: number, total: number) {
  const el = document.getElementById("ready-counter");
  if (el) el.textContent = `${ready} / ${total} players Ready`;
}

function setRoomCodeText(code: string) {
  const el = document.getElementById("room-code");
  if (el) el.textContent = prettyRoom(code);
}

function prettyRoom(code: string) {
  return (code || "").toUpperCase().replace(/(.{3})/g, "$1 ").trim();
}

function getInviteRoomFromURL(): string | null {
  try {
    const u = new URL(location.href);
    const r = (u.searchParams.get("room") || "").toUpperCase().trim();
    return r || null;
  } catch { return null; }
}

function replaceURLRoom(code: string) {
  const url = new URL(location.href);
  if (code) url.searchParams.set("room", code);
  else url.searchParams.delete("room");
  window.history.replaceState(null, "", url.toString());
}

// Await the first RoomState from the socket (so we never render "empty")
function waitForFirstRoomState(timeoutMs = 8000): Promise<RoomStatePayload | null> {
  return new Promise(resolve => {
    const wait = ClientWaitRoomSocket.GetInstance();
    let settled = false;

    const done = (val: RoomStatePayload | null) => {
      if (settled) return;
      settled = true;
      try { wait.UIBroker.Unsubscribe?.("RoomState", handler as any); } catch {}
      resolve(val);
    };

    const timer = setTimeout(() => done(null), timeoutMs);
    const handler = (state: RoomStatePayload) => { clearTimeout(timer); done(state); };

    wait.UIBroker.Subscribe("RoomState", handler as any);

    // If WS closes before a state arrives, bail
    try {
      const ws = (wait as any).ws as WebSocket | undefined;
      if (ws) {
        const onClose = () => { ws.removeEventListener("close", onClose as any); clearTimeout(timer); done(null); };
        ws.addEventListener("close", onClose as any, { once: true });
      }
    } catch {}
  });
}

// ---------- main render ----------
export async function renderWaitingRoom(): Promise<void> {
  const main = document.getElementById("main");
  if (!main) return;

  main.innerHTML = view;

  // loading banner inside cards container; hide until first RoomState
  const cardsContainer = document.getElementById("player-cards-container") as HTMLDivElement | null;
  if (cardsContainer) {
    cardsContainer.style.position = "relative";
    cardsContainer.style.visibility = "hidden";
    const loading = document.createElement("div");
    loading.id = "wait-loading-banner";
    loading.textContent = "Loading room…";
    loading.setAttribute("style", `
      position: absolute; inset: 0; display: grid; place-items: center;
      font-weight: 600; opacity: 0.9;
    `);
    cardsContainer.appendChild(loading);
  }

  // 1) Session
  const me = await fetchJSON(`${API_BASE_URL}/users/session`, { credentials: "include" });
  if (!me?.isLoggedIn) {
    setupAlert('Whoops!', "Please sign in to join a room.", "close");
    navigateTo("create");
    return;
  }
  userId = me.userId;
  username = me.username ?? me.email ?? `Player${userId}`;

  // 2) Resolve room target: URL invite > backend "mine"
  const inviteRoom = getInviteRoomFromURL();
  if (inviteRoom) {
    roomCode = inviteRoom;
  } else {
    const mine = await fetchJSON(`${new URL(API_BASE_URL, location.origin).toString().replace(/\/$/, '')}/rooms/mine`, { credentials: "include" });
    if (mine?.roomCode) {
      roomCode = String(mine.roomCode).toUpperCase();
      // sync URL for share
      replaceURLRoom(roomCode);
    } else {
      setupAlert('Whoops!', "No room to join. Create a game first.", "close");
      navigateTo("create");
      return;
    }
  }
  setRoomCodeText(roomCode);

  // 3) Top controls
  const readyBtn = selectButtonByText("READY");
  const editBtn  = selectButtonByText("EDIT SETTINGS");
  const shareBtn = selectButtonByText("SHARE");
  const roomBox  = document.querySelector<HTMLSpanElement>("div [class*='tracking-widest'], span.block");
  if (roomCode && roomBox) roomBox.textContent = prettyRoom(roomCode);

  readyBtn?.addEventListener("click", () => ClientWaitRoomSocket.GetInstance().ToggleReady());

  // no local/session storage; creation screen will read from /rooms/mine or /users/room-config
  editBtn?.addEventListener("click", () => { navigateTo("create"); });

  shareBtn?.addEventListener("click", async () => {
    if (!roomCode) { setupAlert('Whoops!', "Room code not assigned yet.", "close");return; }
    const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(roomCode)}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setupAlert('Boom!', "Room link copied!", "close");
  });

  // 4) SUBSCRIBE BEFORE CONNECT to avoid missing the initial RoomState
  const wait = ClientWaitRoomSocket.GetInstance();

  const onServerRoomCode = ({ roomCode: rc }: { roomCode: string }) => {
    if (!rc) return;
    roomCode = rc.toUpperCase();
    replaceURLRoom(roomCode);
    setRoomCodeText(roomCode);
    if (roomBox) roomBox.textContent = prettyRoom(roomCode);
  };
  wait.UIBroker.Subscribe("RoomCreated", onServerRoomCode);
  wait.UIBroker.Subscribe("SetRoomCode", onServerRoomCode);

  wait.UIBroker.Subscribe("RoomState", (state) => {
    applyRoomState(state);
  });

	wait.UIBroker.Subscribe("AddPlayer", (p) => {
		upsertServerPlayer(p); renderPlayers();
	});
	wait.UIBroker.Subscribe("RemovePlayer", ({ userId: uid }) => {
		serverPlayers = serverPlayers.filter(p => p.userId !== uid); renderPlayers();
	});
  wait.UIBroker.Subscribe("PlayerReady", ({ userId: uid }) => { setServerReady(uid, true); renderPlayers(); });
  wait.UIBroker.Subscribe("PlayerUnready", ({ userId: uid }) => { setServerReady(uid, false); renderPlayers(); });
  wait.UIBroker.Subscribe("SetHost", ({ userId: newHost }) => { serverPlayers = serverPlayers.map(p => ({ ...p, isHost: p.userId === newHost })); renderPlayers(); });
  wait.UIBroker.Subscribe("Error", ({ message }) => { setupAlert('Whoops!', message, "close"); });
  wait.UIBroker.Subscribe("AllReady", (msg: any) => { allReady(msg as AllReadyMessage); });

  // 5) Connect (after subscriptions are ready)
  const isConnected =
    typeof (wait as any).IsConnected === "function"
      ? (wait as any).IsConnected()
      : (wait as any)._connected;
  const currentRoom =
    typeof (wait as any).CurrentRoomCode === "function"
      ? (wait as any).CurrentRoomCode()
      : (wait as any)._roomCode;

  if (isConnected && currentRoom && roomCode && currentRoom !== roomCode) {
    try { wait.Leave?.(); } catch {}
  }

  const shouldConnect = !isConnected || (currentRoom && roomCode && currentRoom !== roomCode);
  if (shouldConnect) {
    wait.ConnectAndJoin(roomCode, userId, username);
  } else {
  }

  // Block UI until first RoomState
  const first = await waitForFirstRoomState(8000);
  if (!first) {
    setupAlert('Whoops!', "Could not fetch room state. Please try again.", "close");
    navigateTo("create");
    return;
  }

  // reveal UI now (applyRoomState also reveals UI)
  if (cardsContainer) cardsContainer.style.visibility = "visible";
  const loadingNode = document.getElementById("wait-loading-banner");
  if (loadingNode) loadingNode.remove();
}

// ---------- UI construction (cards driven by serverPlayers only) ----------
function buildSlots(n: number) {
  const container = document.getElementById("player-cards-container");
  if (!container) { return; }

  for (const c of cards) c.cleanup?.();
  cards = [];
  container.innerHTML = "";

  for (let i = 0; i < n; i++) {
    const card = createAddPlayerCard({
      onAddLocal: () => {
        const api = ClientWaitRoomSocket.GetInstance() as any;
        if (typeof api.AddLocalGuest === "function") api.AddLocalGuest();
        else if (typeof api.InviteLocalGuest === "function") api.InviteLocalGuest();
        else console.warn("AddLocalGuest/InviteLocalGuest not implemented on ClientWaitRoomSocket.");
      },
      onAddAI: () => { ClientWaitRoomSocket.GetInstance().InviteAI?.(); },
    });

    (card as any).fill = (p: PlayerLite | null) => {
      const el = card.cardElement;
      if (!p) {
        el.dataset.empty = "true";
        const menu = el.querySelector<HTMLDivElement>("#add-player-menu");
        if (menu && !menu.classList.contains("hidden")) menu.classList.add("hidden");
      } else {
        el.dataset.empty = "false";
        el.innerHTML = createUserCard(playerLiteToUserData(p));
        el.dataset.userid = String(p.userId);
      }
    };

    cards.push(card as any);
    container.appendChild(card.cardElement);
  }
}

function renderPlayers() {
  if (totalSlots <= 0) { return; }

  const ordered = [...serverPlayers].sort((a, b) =>
    (Number(b.isHost) - Number(a.isHost)) ||
    (Number(b.ready) - Number(a.ready)) ||
    (a.username || "").localeCompare(b.username || "") ||
    (a.userId - b.userId)
  );

  for (let i = 0; i < totalSlots; i++) {
    const target = ordered[i] ?? null;
    (cards[i] as any)?.fill?.(target);
  }

  const readyCount = serverPlayers.filter(p => p.ready).length;
  setReadyCounter(readyCount, totalSlots);
}

// ---------- server state integration ----------
function upsertServerPlayer(p: PlayerLite) {
  const i = serverPlayers.findIndex(x => x.userId === p.userId);
  if (i >= 0) serverPlayers[i] = { ...serverPlayers[i], ...p };
  else serverPlayers.push(p);
}

function setServerReady(uid: number, ready: boolean) {
  const i = serverPlayers.findIndex(x => x.userId === uid);
  if (i >= 0) serverPlayers[i] = { ...serverPlayers[i], ready };
}

function applyRoomState(state: RoomStatePayload) {
  roomCode = state.roomCode.toUpperCase();
  replaceURLRoom(roomCode);
  setRoomCodeText(roomCode);

  const slotsFromServer =
    typeof state.maxPlayers === "number" && state.maxPlayers > 0
      ? state.maxPlayers
      : (state.players?.length || totalSlots);

  if (slotsFromServer !== totalSlots) {
    totalSlots = slotsFromServer;
    buildSlots(totalSlots);
  }

  serverPlayers = [...state.players]; // backend truth (includes virtuals)
  renderPlayers();

  const container = document.getElementById("player-cards-container") as HTMLDivElement | null;
  if (container) container.style.visibility = "visible";
  const loadingNode = document.getElementById("wait-loading-banner");
  if (loadingNode) loadingNode.remove();

}

// ---------- transforms & payload ----------
function playerLiteToUserData(p: PlayerLite): UserData {
  return { id: p.userId, username: p.username, avatar: undefined, status: 1, score: 0 } as unknown as UserData;
}

function buildPlayersPayload(): [number, string][] {
  const ordered = [...serverPlayers].sort((a, b) =>
    (Number(b.isHost) - Number(a.isHost)) ||
    (Number(b.ready) - Number(a.ready)) ||
    (a.username || "").localeCompare(b.username || "") ||
    (a.userId - b.userId)
  );
  return ordered.slice(0, totalSlots).map(p => [p.userId, p.username] as [number, string]);
}

export type AllReadyMessage = { type: 'AllReady'; nArray?: [number, string][]; };

function allReady(msg: AllReadyMessage) {
  const list = Array.isArray(msg?.nArray) && msg.nArray.length ? msg.nArray : buildPlayersPayload();
  localPlayersUserName = list;

  try { ClientWaitRoomSocket.GetInstance().Dispose(); } catch {}
  
  navigateTo('game');
}
