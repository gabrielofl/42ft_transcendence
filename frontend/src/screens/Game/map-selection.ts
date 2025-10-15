import * as BABYLON from "@babylonjs/core";
import { MapDefinition, Maps } from "./Maps";
import view from "./map-selection.html?raw";
import { ClientGame } from "./ClientGame";
import { PowerUpType } from '@shared/types/messages';
import { navigateTo } from "../../navigation";
import { API_BASE_URL } from "../config";
import { ClientWaitRoomSocket } from "../Game/ClientWaitRoomSocket";

let game: ClientGame;
const ALL_POWERUPS: PowerUpType[] = ["MoreLength","LessLength","CreateBall","Shield","SpeedDown","SpeedUp"];
export let SelectedMap: MapDefinition = Maps.MultiplayerMap;

// ---------- tiny utils ----------
function pretty(code: string) { return code.replace(/(.{3})/g, "$1 ").trim(); }
function replaceURLRoom(code: string | null) {
  const url = new URL(location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  window.history.replaceState(null, '', url.toString());
}
async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}
// Build REST base from API_BASE_URL but strip any trailing /api
function restBase(): string {
  const api = new URL(API_BASE_URL, location.origin);
  const base = new URL(api.toString());
  if (base.pathname.endsWith('/api')) base.pathname = base.pathname.slice(0, -4);
  base.search = '';
  return base.toString().replace(/\/$/, '');
}
function roomsUrl(path = "") { return `${restBase()}/rooms${path}`; }

// Small 2-button modal: Rejoin / Remove
function promptRejoin(roomCode: string): Promise<"rejoin"|"remove"|"cancel"> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#1f2937', color: 'white', padding: '20px', borderRadius: '12px',
      width: 'min(90vw, 440px)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
    } as CSSStyleDeclaration);

    const title = document.createElement('div');
    title.textContent = 'Rejoin previous room?';
    Object.assign(title.style, { fontSize: '18px', fontWeight: '600', marginBottom: '8px' });

    const code = document.createElement('div');
    code.textContent = `You still have an open room ${pretty(roomCode)}.`;
    Object.assign(code.style, { opacity: '0.9', marginBottom: '16px' });

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' });

    const bRejoin = document.createElement('button');
    bRejoin.textContent = 'Rejoin';
    styleBtn(bRejoin, '#10b981');

    const bRemove = document.createElement('button');
    bRemove.textContent = 'Remove';
    styleBtn(bRemove, '#ef4444');

    const bCancel = document.createElement('button');
    bCancel.textContent = 'Cancel';
    styleBtn(bCancel, '#6b7280');

    btnRow.appendChild(bRejoin); btnRow.appendChild(bRemove); btnRow.appendChild(bCancel);
    box.appendChild(title); box.appendChild(code); box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = (r: "rejoin"|"remove"|"cancel") => { document.body.removeChild(overlay); resolve(r); };
    bRejoin.addEventListener('click', () => close('rejoin'));
    bRemove.addEventListener('click', () => close('remove'));
    bCancel.addEventListener('click', () => close('cancel'));
  });
}
function styleBtn(btn: HTMLButtonElement, bg: string) {
  Object.assign(btn.style, {
    background: bg, border: 'none', color: 'white', padding: '10px 12px',
    borderRadius: '10px', cursor: 'pointer', fontWeight: '600'
  } as CSSStyleDeclaration);
}

// Prefill UI from a RoomState-like object OR a {mapKey,powerUpAmount,enabledPowerUps} object
function applyConfigToUI(stateLike: any) {
  try {
    const cfg = stateLike?.config || stateLike;
    const mapKey = cfg?.mapKey || 'MultiplayerMap';
    const pua = Number.isFinite(cfg?.powerUpAmount) ? cfg.powerUpAmount : 5;
    const wind = Number.isFinite(cfg?.windAmount) ? cfg.windAmount : 50;
    const pointToWin = Number.isFinite(cfg?.pointToWinAmount) ? cfg.pointToWinAmount : 7;
    const enabled = new Set(Array.isArray(cfg?.enabledPowerUps) ? cfg.enabledPowerUps : ALL_POWERUPS);

    const mapList = document.getElementById("map-list")!;
    Array.from(mapList.children).forEach(el => (el as HTMLElement).style.background = "");
    const li = Array.from(mapList.children).find(el => (el as HTMLElement).textContent?.trim() === mapKey) as HTMLElement | undefined;
    if (li) li.style.background = "#ddd";

    const def = Maps[mapKey as keyof typeof Maps] ?? Maps.MultiplayerMap;
    renderPreview(def);

    const powerupAmountSlider = document.getElementById('powerup-amount') as HTMLInputElement | null;
    const powerupAmountValue  = document.getElementById('powerup-amount-value');
    if (powerupAmountSlider && powerupAmountValue) {
      powerupAmountSlider.value = String(pua);
      powerupAmountValue.textContent = powerupAmountSlider.value;
    }

    const powerupTypesContainer = document.getElementById('powerup-types');
    if (powerupTypesContainer) {
      powerupTypesContainer
        .querySelectorAll<HTMLInputElement>('input[name="powerup-type"]')
        .forEach(cb => { cb.checked = enabled.has(cb.value as PowerUpType); });
    }

    const windAmountSlider = document.getElementById('wind-amount') as HTMLInputElement | null;
    const windAmountValue  = document.getElementById('wind-amount-value');
    if (windAmountSlider && windAmountValue) {
      windAmountSlider.value = String(wind);
      windAmountValue.textContent = windAmountSlider.value;
    }

    const pointToWinAmountSlider = document.getElementById('point-to-win-amount') as HTMLInputElement | null;
    const pointToWinAmountValue  = document.getElementById('point-to-win-amount-value');
    if (pointToWinAmountSlider && pointToWinAmountValue) {
      pointToWinAmountSlider.value = String(pointToWin);
      pointToWinAmountValue.textContent = pointToWinAmountSlider.value;
    }
  } catch {}
}

// ---------- entry ----------
export async function renderMapSelection(): Promise<void> {
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = view;

  // 0) Ask backend if I already belong to a room (no storage trust)
  const me = await fetchJSON(`${API_BASE_URL}/users/session`, { credentials: 'include' });
  if (!me?.isLoggedIn) {
    setupMapSelectionControls();
    return;
  }

  const mine = await fetchJSON(roomsUrl('/mine'), { credentials: 'include' });
  if (mine && mine.roomCode) {
    const choice = await promptRejoin(mine.roomCode);
    if (choice === 'rejoin') {
      replaceURLRoom(mine.roomCode);
      navigateTo('waiting');
      return;
    }
    if (choice === 'remove') {
      await fetch(roomsUrl(`/${encodeURIComponent(mine.roomCode)}/leave`), {
        method: 'POST',
        credentials: 'include'
      }).catch(() => {});
      replaceURLRoom(null);
    }
    // else 'cancel' → stay
  }

  setupMapSelectionControls();

  // Prefill from server if available: 1) prior room state; 2) last saved user config
  if (mine && mine.config) applyConfigToUI(mine);
  else {
    const lastCfg = await fetchJSON(`${API_BASE_URL}/users/room-config`, { credentials: 'include' });
    if (lastCfg) applyConfigToUI(lastCfg);
  }
}

// ---------- UI / flow ----------
function setupMapSelectionControls(): void {
  const powerupAmountSlider = document.getElementById('powerup-amount') as HTMLInputElement;
  const powerupAmountValue  = document.getElementById('powerup-amount-value');
  const powerupTypesContainer = document.getElementById('powerup-types');
  const windAmountSlider = document.getElementById('wind-amount') as HTMLInputElement | null;
  const windAmountValue  = document.getElementById('wind-amount-value');
  const pointToWinAmountSlider = document.getElementById('point-to-win-amount') as HTMLInputElement | null;
  const pointToWinAmountValue  = document.getElementById('point-to-win-amount-value');
  const createGameBtn = document.getElementById('create-game-btn');
  const mapList = document.getElementById("map-list")!;

  // Build map list
  let selectedMapKey: string | null = null;

  Object.entries(Maps).forEach(([key, def]) => {
    const li = document.createElement("li");
    li.textContent = key;
    li.style.cursor = "pointer";
    li.style.padding = "5px";

    li.addEventListener("click", () => {
      Array.from(mapList.children).forEach(el => (el as HTMLElement).style.background = "");
      li.style.background = "#ddd";
      selectedMapKey = key;
      renderPreview(def);
      (document.getElementById("select-map") as HTMLButtonElement | null)?.removeAttribute("disabled");
    });

    mapList.appendChild(li);
  });

  // Slider label
  if (powerupAmountSlider && powerupAmountValue) {
    powerupAmountValue.textContent = powerupAmountSlider.value;
    powerupAmountSlider.addEventListener('input', () => {
      powerupAmountValue.textContent = powerupAmountSlider.value;
    });
  }

  if (windAmountSlider && windAmountValue) {
    windAmountValue.textContent = windAmountSlider.value;
    windAmountSlider.addEventListener('input', () => {
      windAmountValue.textContent = windAmountSlider.value;
    });
  }

  if (pointToWinAmountSlider && pointToWinAmountValue) {
    pointToWinAmountValue.textContent = pointToWinAmountSlider.value;
    pointToWinAmountSlider.addEventListener('input', () => {
      pointToWinAmountValue.textContent = pointToWinAmountSlider.value;
    });
  }

  // Power-up checkboxes
  if (powerupTypesContainer) {
    const defaultEnabled = new Set(ALL_POWERUPS);
    powerupTypesContainer.innerHTML = ALL_POWERUPS.map(type => `
      <label class="flex items-center space-x-2 cursor-pointer text-white">
        <input type="checkbox" name="powerup-type" value="${type}"
          class="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-500 rounded"
          ${defaultEnabled.has(type) ? "checked" : ""}>
        <span>${type}</span>
      </label>
    `).join('');
  }

  // ---- create / save button flow ----
  createGameBtn?.addEventListener('click', async () => {
    // 1) collect options
    const enabledPowerups = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="powerup-type"]:checked')
    ).map(cb => cb.value as PowerUpType);

    const chosenMapKey = selectedMapKey ?? "MultiplayerMap";
    const mapDef = Maps[chosenMapKey as keyof typeof Maps] ?? Maps.MultiplayerMap;
    const suggestedMaxPlayers = Array.isArray((mapDef as any)?.spots) ? (mapDef as any).spots.length : undefined;

    const createOptions = {
      mapKey: chosenMapKey,
      powerUpAmount: parseInt(powerupAmountSlider.value, 10),
      enabledPowerUps: enabledPowerups,
      windAmount: parseInt(windAmountSlider?.value ?? '50', 10),
      pointToWinAmount: parseInt(pointToWinAmountSlider?.value ?? '7', 10),
      maxPlayers: suggestedMaxPlayers, // suggestion only; backend decides
    };

    // 2) ensure session
    const session = await fetchJSON(`${API_BASE_URL}/users/session`, { credentials: 'include' });
    if (!session?.isLoggedIn) {
      alert('Please sign in to continue.');
      return;
    }

    // 3) Always create NEW room
    const created = await fetchJSON(roomsUrl(''), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createOptions)
    });

    if (!created?.roomCode) {
      alert('Failed to create room.');
      return;
    }

    const code = String(created.roomCode).toUpperCase();
    replaceURLRoom(code);

    // 3.5) persist “last used config” server-side (no localStorage)
    fetch(`${API_BASE_URL}/users/room-config`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mapKey: createOptions.mapKey,
        powerUpAmount: createOptions.powerUpAmount,
        enabledPowerUps: createOptions.enabledPowerUps,
        windAmount: createOptions.windAmount,
        pointToWinAmount: createOptions.pointToWinAmount
      })
    }).catch(() => {});

    // 4) Connect WS; send SetMapConfig on first state (host only)
    const socket = ClientWaitRoomSocket.GetInstance();
    const onFirstState = (state: any) => {
      if (state?.hostId === session.userId) {
        socket.SetMapConfig?.({
          mapKey: createOptions.mapKey,
          powerUpAmount: createOptions.powerUpAmount,
          enabledPowerUps: createOptions.enabledPowerUps,
          windAmount: createOptions.windAmount,
          maxPlayers: createOptions.maxPlayers,
          pointToWinAmount: createOptions.pointToWinAmount,
        });
      }
      socket.UIBroker.Unsubscribe?.("RoomState", onFirstState);
    };
    socket.UIBroker.Subscribe("RoomState", onFirstState);
    socket.ConnectAndJoin(code, session.userId, session.username ?? session.email ?? `Player${session.userId}`);

    // 5) Navigate to waiting
    navigateTo('waiting');
  });
}

function renderPreview(mapDef: MapDefinition) {
  const canvas = document.getElementById("map-canvas") as HTMLCanvasElement;
  SelectedMap = mapDef;
  if (game) game.Dispose();
  game = new ClientGame(canvas, SelectedMap, true);
}
