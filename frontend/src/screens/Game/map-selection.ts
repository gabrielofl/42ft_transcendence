// map-selection.ts
import * as BABYLON from "@babylonjs/core";
import { MapDefinition, Maps } from "./Maps";
import view from "./map-selection.html?raw";
import { ClientGame } from "./ClientGame";
import { PowerUpType } from '@shared/types/messages';
import { navigateTo } from "../../navigation";

let game: ClientGame;
const ALL_POWERUPS: PowerUpType[] = ["MoreLength","LessLength","CreateBall","Shield","SpeedDown","SpeedUp"];
export let SelectedMap: MapDefinition = Maps.MultiplayerMap;

export function renderMapSelection(): void {
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = view;
  setupMapSelectionControls();
}

function setupMapSelectionControls(): void {
  const powerupAmountSlider = document.getElementById('powerup-amount') as HTMLInputElement;
  const powerupAmountValue  = document.getElementById('powerup-amount-value');
  const powerupTypesContainer = document.getElementById('powerup-types');
  const createGameBtn = document.getElementById('create-game-btn');
  const mapList = document.getElementById("map-list")!;

  // hydrate UI from last config (optional)
  const last = readConfigFromStorage();
  if (last) {
    if (powerupAmountSlider && powerupAmountValue) {
      powerupAmountSlider.value = String(last.powerUpAmount ?? 5);
      powerupAmountValue.textContent = powerupAmountSlider.value;
    }
  }

  // Build map list
  let selectedMapKey: string | null = last?.selectedMapKey ?? null;

  Object.entries(Maps).forEach(([key, def]) => {
    const li = document.createElement("li");
    li.textContent = key;
    li.style.cursor = "pointer";
    li.style.padding = "5px";

    if (selectedMapKey === key) {
      li.style.background = "#ddd";
      renderPreview(def);
    }

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

  // Power-up checkboxes
  if (powerupTypesContainer) {
    const enabled = new Set(last?.enabledPowerUpTypes ?? ALL_POWERUPS);
    powerupTypesContainer.innerHTML = ALL_POWERUPS.map(type => `
      <label class="flex items-center space-x-2 cursor-pointer text-white">
        <input type="checkbox" name="powerup-type" value="${type}"
          class="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-500 rounded"
          ${enabled.has(type) ? "checked" : ""}>
        <span>${type}</span>
      </label>
    `).join('');
  }

  // Create Match = persist config + backend create + navigateTo('waiting')
  createGameBtn?.addEventListener('click', async () => {
    const enabledPowerups = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="powerup-type"]:checked')
    ).map(cb => cb.value as PowerUpType);

    // persist locally (so waiting-room & reconnects can read it)
    const cfg = {
      selectedMapKey: selectedMapKey ?? "MultiplayerMap",
      powerUpAmount: parseInt(powerupAmountSlider.value, 10),
      enabledPowerUpTypes: enabledPowerups,
    };
    localStorage.setItem('pongGameConfig', JSON.stringify(cfg));

    // ensure session
    const session = await fetchJSON('/api/session', { credentials: 'include' });
    if (!session?.isLoggedIn) {
      alert('Please sign in to create a match.');
      return;
    }

    // create room on backend with current config; backend returns roomCode
    const createRes = await fetchJSON('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mapKey: cfg.selectedMapKey,
        powerUpAmount: cfg.powerUpAmount,
        enabledPowerUps: cfg.enabledPowerUpTypes
      })
    });

    if (!createRes?.roomCode) {
      alert(createRes?.message ?? 'Could not create room');
      return;
    }

    sessionStorage.setItem('roomCode', createRes.roomCode);
    navigateTo('waiting');
  });
}

function renderPreview(mapDef: MapDefinition) {
  const canvas = document.getElementById("map-canvas") as HTMLCanvasElement;
  SelectedMap = mapDef;
  if (game) game.Dispose();
  game = new ClientGame(canvas, SelectedMap, true);
}

function readConfigFromStorage(): {
  selectedMapKey?: string;
  powerUpAmount?: number;
  enabledPowerUpTypes?: PowerUpType[];
} | null {
  try {
    const s = localStorage.getItem('pongGameConfig');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}
