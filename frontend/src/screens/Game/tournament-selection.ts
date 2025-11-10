import { MapDefinition, TournamentMaps } from "./Maps";
import view from "./tournament-selection.html?raw";
import { ClientGame } from "./ClientGame";
import { PowerUpType } from '@shared/types/messages';
import { navigateTo } from "../../navigation";
import { API_BASE_URL } from "../config";
import { clearTournamentMatchInfo } from "../../services/tournament-state";

let game: ClientGame;
const ALL_POWERUPS: PowerUpType[] = ["MoreLength","LessLength","CreateBall","Shield","SpeedDown","SpeedUp"];
export let SelectedMap: MapDefinition = TournamentMaps.ObstacleMap;

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

export async function renderTournamentSelection(): Promise<void> {
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = view;
  setupTournamentSelectionControls();
}

function setupTournamentSelectionControls(): void {
  const powerupAmountSlider = document.getElementById('powerup-amount') as HTMLInputElement;
  const powerupAmountValue  = document.getElementById('powerup-amount-value');
  const powerupTypesContainer = document.getElementById('powerup-types');
  const windAmountSlider = document.getElementById('wind-amount') as HTMLInputElement | null;
  const windAmountValue = document.getElementById('wind-amount-value');
  const matchTimeSlider = document.getElementById('match-time') as HTMLInputElement | null;
  const matchTimeValue = document.getElementById('match-time-value');
  const createGameBtn = document.getElementById('create-game-btn');
  const mapList = document.getElementById("map-list")!;

  // Build map list
  let selectedMapKey: string | null = null;

  Object.entries(TournamentMaps).forEach(([key, def]) => {
    const li = document.createElement("li");
    li.textContent = key;
    li.style.cursor = "pointer";
    li.style.padding = "5px";

    li.addEventListener("click", () => {
      Array.from(mapList.children).forEach(el => (el as HTMLElement).style.background = "");
      li.style.background = "#ddd";
      selectedMapKey = key;
      renderPreview(def);
    });

    mapList.appendChild(li);
  });

  // Slider labels
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

  // Match time slider
  if (matchTimeSlider && matchTimeValue) {
    // Helper function to format seconds to MM:SS
    const formatTime = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Set initial value
    matchTimeValue.textContent = formatTime(parseInt(matchTimeSlider.value));
    
    matchTimeSlider.addEventListener('input', () => {
      const seconds = parseInt(matchTimeSlider.value);
      matchTimeValue.textContent = formatTime(seconds);
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

  // Create tournament button
  createGameBtn?.addEventListener('click', async () => {
    // 1) collect options
    const enabledPowerups = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="powerup-type"]:checked')
    ).map(cb => cb.value as PowerUpType);

    const chosenMapKey = selectedMapKey ?? "ObstacleMap";
    const mapDef = TournamentMaps[chosenMapKey as keyof typeof TournamentMaps] ?? TournamentMaps.ObstacleMap;
    
    // 2) Limpiar estado de torneos anteriores
    clearTournamentMatchInfo();
    sessionStorage.removeItem('pendingCountdown');
    
    // 3) ensure session
    const session = await fetchJSON(`${API_BASE_URL}/users/session`, { credentials: 'include' });
    if (!session?.isLoggedIn) {
      alert('Please sign in to create a tournament.');
      return;
    }

    const windSlider = document.getElementById('wind-amount') as HTMLInputElement | null;
    const timeSlider = document.getElementById('match-time') as HTMLInputElement | null;

    const tournamentConfig = {
      name: `Tournament by ${session.username || 'Player'}`,
      maxPlayers: 8,  // Siempre 8 jugadores por ahora
      mapKey: chosenMapKey,
      powerUpAmount: parseInt(powerupAmountSlider.value, 10),
      enabledPowerUps: enabledPowerups,
      windAmount: windSlider ? parseInt(windSlider.value, 10) : 50,
      matchTimeLimit: timeSlider ? parseInt(timeSlider.value, 10) : 180, // Tiempo configurable
    };

    // 3) Create tournament
    const created = await fetchJSON(`${API_BASE_URL}/tournaments`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tournamentConfig)
    });

    if (!created?.tournamentId) {
      alert('Failed to create tournament.');
      return;
    }
    
    const tournamentId = created.tournamentId;

    // 4) Store tournament ID for the waiting room
    try {
      sessionStorage.setItem("currentTournamentId", String(tournamentId));
      // Limpiar información de torneos anteriores
      clearTournamentMatchInfo();
    } catch (e) {
      console.error('Failed to store in sessionStorage:', e);
    }

    // 5) Navigate to tournament waiting room (limpiar URL params)
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('tournament');
    window.history.replaceState(null, '', cleanUrl.toString());
    
    navigateTo('tournament-waiting');
  });
}

function renderPreview(mapDef: MapDefinition) {
  const canvas = document.getElementById("map-canvas") as HTMLCanvasElement;
  SelectedMap = mapDef;
  if (game) game.Dispose();
  game = new ClientGame(canvas, SelectedMap, true);
}

