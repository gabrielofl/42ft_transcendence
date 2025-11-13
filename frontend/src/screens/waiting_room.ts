import view from "./waiting_room.html?raw";
import { ClientWaitRoomSocket } from "./Game/ClientWaitRoomSocket";
import { createAddPlayerCard } from "./add_player_card";
import { createUserCard } from "./user-card";
import { navigateTo } from "../navigation";
import { PlayerLite, RoomStatePayload, UserData } from "@shared/types/messages";
import { BASE_URL, API_BASE_URL } from "./config";
import { setupAlert } from "./AlertModal.js";
import { fetchJSON } from "./utils";
import { WaitPayloads } from "@shared/types/messages";

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

// ---------- main render ----------
export async function renderWaitingRoom(): Promise<void> {
  const main = document.getElementById("main");
  if (!main) return;

  main.innerHTML = view;
	
  totalSlots = 0;
  cards = [];

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

  const url = new URL(location.href);
  let code = (url.searchParams.get("room") || "").toUpperCase().trim();

  if (!code) {
    const mine = await fetchJSON(`${BASE_URL}/rooms/mine`, { credentials: "include" });
    if (!mine?.roomCode) { setupAlert('Whoops!', "No room to join. Create a game first.", "close"); navigateTo("create"); return; }
    code = String(mine.roomCode).toUpperCase();
    url.searchParams.set("room", code);
    history.replaceState(null, "", url.toString());
  }
  	roomCode = code;
	setRoomCodeText(roomCode);
	
	const state = await fetchJSON(`${BASE_URL}/rooms/${encodeURIComponent(roomCode)}`, { credentials: "include" });
	if (!state) { setupAlert('Whoops!', "Room not found or closed.", "close"); navigateTo("create"); return; }
		console.log('this is state: ', state);
	applyRoomState(state);

  // 3) Top controls
  const readyBtn = selectButtonByText("READY");
  const editBtn  = selectButtonByText("EDIT SETTINGS");
  const shareBtn = selectButtonByText("SHARE");
  const roomBox  = document.querySelector<HTMLSpanElement>("div [class*='tracking-widest'], span.block");
  if (roomCode && roomBox) roomBox.textContent = prettyRoom(roomCode);

  readyBtn?.addEventListener("click", () => ClientWaitRoomSocket.GetInstance().ToggleReady());

	editBtn?.addEventListener("click", () => {
		try {
			sessionStorage.setItem("ms.intent", "edit");
			sessionStorage.setItem("ms.room", roomCode);
		} catch {}
		navigateTo("create");
		});

  shareBtn?.addEventListener("click", async () => {
    if (!roomCode) { setupAlert('Whoops!', "Room code not assigned yet.", "close");return; }
    const url = `${location.origin}${location.pathname}?room=${encodeURIComponent(roomCode)}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setupAlert('Boom!', "Room link copied!", "close");
  });

  const wait = ClientWaitRoomSocket.GetInstance();

unbindAll(wait.UIBroker);

let pushedEdit = false;
const onRoomState = (s: RoomStatePayload) => {
  applyRoomState(s);
  if (!pushedEdit) {
    pushedEdit = true;
    try {
      const raw = sessionStorage.getItem("ms.pendingConfig");
      if (raw && s?.roomCode?.toUpperCase() === roomCode) {
        const cfg = JSON.parse(raw);
        ClientWaitRoomSocket.GetInstance().SetMapConfig?.({
          mapKey: cfg.mapKey,
          powerUpAmount: cfg.powerUpAmount,
          enabledPowerUps: cfg.enabledPowerUps,
          maxPlayers: cfg.maxPlayers,
          windAmount: cfg.windAmount,
          pointToWinAmount: cfg.pointToWinAmount,
        });
      }
    } catch {}
    try {
      sessionStorage.removeItem("ms.intent");
      sessionStorage.removeItem("ms.room");
      sessionStorage.removeItem("ms.pendingConfig");
    } catch {}
  }
};

const onServerRoomCode = ({ roomCode: rc }: { roomCode: string }) => {
  if (!rc) return;
  roomCode = rc.toUpperCase();
  replaceURLRoom(roomCode);
  setRoomCodeText(roomCode);
  const roomBox = document.querySelector<HTMLSpanElement>("div [class*='tracking-widest'], span.block");
  if (roomBox) roomBox.textContent = prettyRoom(roomCode);
};

bind("RoomCreated", onServerRoomCode, wait.UIBroker);
bind("SetRoomCode", onServerRoomCode, wait.UIBroker);
bind("RoomState", onRoomState, wait.UIBroker);
bind("AddPlayer", (p) => { upsertServerPlayer(p); renderPlayers(); }, wait.UIBroker);
bind("RemovePlayer", ({ userId: uid }) => { serverPlayers = serverPlayers.filter(p => p.userId !== uid); renderPlayers(); }, wait.UIBroker);
bind("PlayerReady", ({ userId: uid }) => { setServerReady(uid, true); renderPlayers(); }, wait.UIBroker);
bind("PlayerUnready", ({ userId: uid }) => { setServerReady(uid, false); renderPlayers(); }, wait.UIBroker);
bind("SetHost", ({ userId: newHost }) => { serverPlayers = serverPlayers.map(p => ({ ...p, isHost: p.userId === newHost })); renderPlayers(); }, wait.UIBroker);
bind("Error", ({ message }) => { setupAlert('Whoops!', message, "close"); }, wait.UIBroker);
bind("AllReady", (msg) => { allReady(msg as any); }, wait.UIBroker);

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

function asArray<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v) as T[];
  return [];
}

function applyRoomState(state: RoomStatePayload) {
  const playersArr = asArray<PlayerLite>(state.players);
  roomCode = state.roomCode.toUpperCase();
  replaceURLRoom(roomCode);
  setRoomCodeText(roomCode);

  const slotsFromServer =
    typeof state.maxPlayers === "number" && state.maxPlayers > 0
      ? state.maxPlayers
      : (playersArr.length || totalSlots);

  if (slotsFromServer !== totalSlots || cards.length !== slotsFromServer) {
    totalSlots = slotsFromServer;
    buildSlots(totalSlots);
  }

  serverPlayers = [...playersArr];
  renderPlayers();

  const container = document.getElementById("player-cards-container") as HTMLDivElement | null;
  if (container) container.style.visibility = "visible";
  document.getElementById("wait-loading-banner")?.remove();
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

export function cleanupWaitingRoom() {
  unbindAll(ClientWaitRoomSocket.GetInstance().UIBroker);
  try { ClientWaitRoomSocket.GetInstance().Dispose(); } catch {}
  try { sessionStorage.removeItem("roomCode"); } catch {}
  const url = new URL(location.href);
  url.searchParams.delete("room");
  history.replaceState(null, "", url.toString());
}

type Handler<E> = (p: E) => void;
const localSubs = new Map<string, Set<Function>>();

function bind<K extends keyof WaitPayloads>(
  event: K,
  handler: Handler<WaitPayloads[K]>,
  broker = ClientWaitRoomSocket.GetInstance().UIBroker
) {
  const key = String(event);
  let set = localSubs.get(key);
  if (!set) { set = new Set(); localSubs.set(key, set); }

  if (set.has(handler)) return;

  broker.Subscribe(event, handler);
  set.add(handler);
}

function unbindAll(broker = ClientWaitRoomSocket.GetInstance().UIBroker) {
  for (const [key, set] of localSubs.entries()) {
    for (const fn of set) {
      broker.Unsubscribe(key as keyof WaitPayloads, fn as any);
    }
  }
  localSubs.clear();
}
