import view from "./tournament-lobby.html?raw";
import { navigateTo } from "../navigation";
import { API_BASE_URL } from "./config";

export async function renderTournamentLobby(): Promise<void> {
  const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = view;

  // Limpiar cualquier ID viejo del URL al entrar al lobby
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('tournament');
  window.history.replaceState(null, '', cleanUrl.toString());
  
  // Limpiar sessionStorage de torneos viejos al entrar al lobby
  sessionStorage.removeItem('currentTournamentId');

  // Setup buttons
  document.getElementById('refresh-btn')?.addEventListener('click', loadTournaments);
  document.getElementById('create-tournament-btn')?.addEventListener('click', () => {
    navigateTo('tournament-selection');  // 'tournament' es la pantalla de configuración
  });

  // Load initial data
  await loadTournaments();

  // Auto-refresh cada 5 segundos
  const interval = setInterval(loadTournaments, 5000);
  
  // Cleanup al salir
  window.addEventListener('beforeunload', () => clearInterval(interval));
}

async function loadTournaments() {
  try {
    const response = await fetch(`${API_BASE_URL}/tournaments`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Failed to load tournaments:', response.status);
      renderWaitingTournaments([]);
      return;
    }
    
    const data = await response.json();
    renderWaitingTournaments(data.tournaments || []);
  } catch (error) {
    console.error('Error loading tournaments:', error);
    renderWaitingTournaments([]);
  }
}

function renderWaitingTournaments(tournaments: any[]) {
  const container = document.getElementById('tournaments-list');
  if (!container) return;

  if (tournaments.length === 0) {
    container.innerHTML = `
      <div class="text-gray-400 text-center py-8">
        No tournaments available. Create one!
      </div>
    `;
    return;
  }

  container.innerHTML = tournaments.map(t => `
    <div class="bg-gray-800 rounded-lg p-4 flex justify-between items-center hover:bg-gray-700 transition">
      <div class="flex-1">
        <h3 class="text-white font-bold text-lg">${escapeHtml(t.name)}</h3>
        <div class="text-sm text-gray-400">
          Players: <span class="text-yellow-400 font-bold">${t.player_count || 0} / 8</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          Created ${formatDate(t.created_at)}
        </div>
      </div>
      
      <div>
        <button 
          class="btn-primary px-4 py-2 text-sm"
          onclick="window.joinTournament(${t.id})"
        >
          Join
        </button>
      </div>
    </div>
  `).join('');

  // Attach global functions (temporal hack)
  (window as any).joinTournament = async (id: number) => {
    try {
      // Verificar que el torneo existe y tiene espacio
      const response = await fetch(`${API_BASE_URL}/tournaments/${id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        alert('Tournament not found or already started.');
        await loadTournaments();
        return;
      }
      
      const tournament = await response.json();
      
      if (tournament.players.length >= 8) {
        alert('Tournament is full!');
        await loadTournaments();
        return;
      }
      
      // Guardar ID y navegar (el WebSocket lo unirá automáticamente)
      try {
        sessionStorage.setItem("currentTournamentId", String(id));
      } catch (e) {
        console.error('Failed to save to sessionStorage:', e);
      }
      
      navigateTo('tournament-waiting');
      
    } catch (error) {
      console.error('Error joining tournament:', error);
      alert('Failed to join tournament. Please try again.');
    }
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

