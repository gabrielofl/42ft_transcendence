// join-game.ts
import view from "./join-game.html?raw";
import { navigateTo } from "../navigation";
import { API_BASE_URL } from "./config";

type RoomSummary = {
  code: string;
  host?: string;
  players: number;
  maxPlayers?: number | null;
  createdAt?: string;
};

type MineState = {
  roomCode: string;
  status: 'waiting' | 'active' | 'closed';
  createdAt?: string;
  maxPlayers?: number | null;
  players: Array<{ userId: number; username: string; isHost: boolean; ready: boolean }>;
};

const ROOMS_URL = `${API_BASE_URL}/rooms?status=waiting`;

async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function renderJoinGame(): Promise<void> {
  const main = document.getElementById("main");
  if (!main) return;

  main.innerHTML = view;
  wireUI();
  await loadRooms();

  const mine = await fetchJSON<MineState>(`${API_BASE_URL.replace(/\/$/,'')}/rooms/mine`, { credentials: 'include' });
  if (mine?.roomCode) renderResumeCard(mine);
}

function prettyRoom(code: string) {
  return (code || "").toUpperCase().replace(/(.{3})/g, "$1 ").trim();
}

function renderResumeCard(mine: MineState) {
  const container = document.getElementById("rooms-list")!;
  const card = document.createElement("div");
  const count = Array.isArray(mine.players) ? mine.players.length : 0;
  const cap = (mine.maxPlayers ?? null) != null ? `/${mine.maxPlayers}` : '';
  const when = mine.createdAt ? timeAgo(mine.createdAt) : '';

  card.className = "col-span-full w-full bg-yellow-900/40 border border-yellow-700 rounded-xl mt-6 mb-6 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3";
  card.innerHTML = `
    <div>
      <div class="font-press text-lg">Resume your room</div>
      <div class="text-sm opacity-80">
        ${prettyRoom(mine.roomCode)} • ${count}${cap} players ${when ? '• ' + when : ''} • ${mine.status || 'waiting'}
      </div>
    </div>
    <div class="flex gap-2">
      <button id="resume-room" class="bg-green-800 hover:bg-green-700 px-3 py-2 rounded-lg font-press">Resume</button>
      <button id="leave-room" class="bg-red-800 hover:bg-red-700 px-3 py-2 rounded-lg font-press">Leave</button>
    </div>
  `;
  container.prepend(card);

  (card.querySelector('#resume-room') as HTMLButtonElement)?.addEventListener('click', () => {
	const url = new URL(location.href);
	url.searchParams.set('room', mine.roomCode.toUpperCase());
	history.pushState(null, '', url.toString());
	navigateTo('waiting');
	});


  (card.querySelector('#leave-room') as HTMLButtonElement)?.addEventListener('click', async () => {
	await fetch(`${API_BASE_URL.replace(/\/$/,'')}/rooms/${encodeURIComponent(mine.roomCode)}/leave`, {
		method: 'POST', credentials: 'include'
	}).catch(()=>{});
	const url = new URL(location.href);
	url.searchParams.delete('room');
	history.replaceState(null, '', url.toString());
	await loadRooms();
	});

}

function wireUI() {
  const joinByCodeBtn = document.getElementById("join-by-code-btn") as HTMLButtonElement | null;
  const codeInput = document.getElementById("room-code-input") as HTMLInputElement | null;
  const refreshBtn = document.getElementById("refresh-rooms") as HTMLButtonElement | null;
  const searchInput = document.getElementById("rooms-search") as HTMLInputElement | null;

  joinByCodeBtn?.addEventListener("click", () => {
  	const raw = (codeInput?.value || "").toUpperCase().replace(/\s+/g, "");
	if (!raw) return;
	const url = new URL(location.href);
	url.searchParams.set('room', raw);
	history.pushState(null, '', url.toString());
	navigateTo("waiting");
	});


  codeInput?.addEventListener("keyup", (e) => {
    if ((e as KeyboardEvent).key === "Enter") joinByCodeBtn?.click();
  });

  refreshBtn?.addEventListener("click", () => loadRooms());

  searchInput?.addEventListener("input", () => filterRooms(searchInput.value));
}

let currentRooms: RoomSummary[] = [];

async function loadRooms() {
  const list = await fetchJSON<RoomSummary[]>(ROOMS_URL, { credentials: "include" });
  currentRooms = Array.isArray(list) ? list : [];
  renderRooms(currentRooms);
}

function renderRooms(rooms: RoomSummary[]) {
  const container = document.getElementById("rooms-list")!;
  const empty = document.getElementById("rooms-empty")!;

  container.innerHTML = "";

  if (!rooms.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const r of rooms) {
    const card = document.createElement("div");
    card.className = "bg-gray-900 rounded-xl p-4 shadow border border-gray-800 flex flex-col gap-2";

    const header = document.createElement("div");
    header.className = "flex justify-between items-center";
    header.innerHTML = `
      <div class="font-press text-xl">${r.host ? escapeHTML(r.host) : "Unknown Host"}</div>
      <div class="text-sm opacity-70">${escapeHTML(r.code)}</div>
    `;

    const meta = document.createElement("div");
    meta.className = "text-sm opacity-80";
    const cap = r.maxPlayers ?? "?";
    const when = r.createdAt ? timeAgo(r.createdAt) : "";
    meta.textContent = `${r.players}/${cap} players ${when ? "• " + when : ""}`;

    const actions = document.createElement("div");
    actions.className = "flex justify-end";
    const btn = document.createElement("button");
    btn.className = "bg-green-800 hover:bg-green-700 px-3 py-2 rounded-lg font-press";
    btn.textContent = "Join";
    btn.addEventListener("click", () => joinRoom(r.code));
    actions.appendChild(btn);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(actions);
    container.appendChild(card);
  }
}

function filterRooms(q: string) {
  q = (q || "").trim().toUpperCase();
  if (!q) return renderRooms(currentRooms);
  const filtered = currentRooms.filter(r =>
    r.code.toUpperCase().includes(q) ||
    (r.host || "").toUpperCase().includes(q)
  );
  renderRooms(filtered);
}

function joinRoom(code: string) {
  const c = (code || "").toUpperCase();
  if (!c) return;
  const url = new URL(location.href);
  url.searchParams.set('room', c);
  history.pushState(null, '', url.toString());
  navigateTo("waiting");
}

// ---- helpers ----
function escapeHTML(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] as string));
}
function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
