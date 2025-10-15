import profileMatchHistory from "./profile-match-history.html?raw";
import { replaceTemplatePlaceholders } from "./utils";
import { initProfileModal, setupProfileLinks } from "./ProfileModal";
import { API_BASE_URL } from "./config";

// Keep track of current page and perPage
let currentPage = 1;
const perPage = 5;

// Ask Jorge if already exist
export type UsersMap = Record<string, {
  id: number;
  username: string;
  avatar?: string;
  score?: number;
  status?: number;
  show_scores_publicly?: number;
  // add other fields from db
}>;


// Add to utils?
async function getCurrentUser() {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: 'include',
    headers: {
      
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
  return res.json();
}


export function getUserFromMap(usersMap: UsersMap, id: number) {
  // JSON object keys become strings, so try both forms
  return usersMap[id] ?? usersMap[String(id)] ?? {
    id,
    username: 'Unknown',
    avatar: 'default.jpg',
    score: 0,
    status: 0,
  	show_scores_publicly: 1
  };
}



export async function renderHistoryTab() {
  const container = document.getElementById('profile-content');
	if (!container) return ;
  	try {
		container.innerHTML = replaceTemplatePlaceholders(profileMatchHistory, {API_BASE_URL});
		// Fetch current user
		 const me = await getCurrentUser();
		 const userId = me.id;
		
		setupHistoryTab(userId);
	} catch (err) {
    console.error("Failed to load account:", err);
    container.innerHTML = `<p class="text-red-500">Failed to load Match History tab.</p>`;
  	}
}

export async function setupHistoryTab(userId: number) {
	
	// Load first page
	await loadMatches(userId, currentPage);
	initProfileModal();
    setupProfileLinks();
}

async function loadMatches(userId: number, page: number) {
  try {
    const data = await getUserMatches(userId, page, perPage);

    // console.debug('loadMatches data:', data); // helpful while debugging
	// Update total friends
	const totalMatchesEl = document.querySelector<HTMLParagraphElement>('#total-matches');
	if (totalMatchesEl) totalMatchesEl.textContent = `Number of matches played: ${data.total}`;

	// Update page info
	const pageEl = document.querySelector<HTMLParagraphElement>('#page-info');
	if (pageEl) pageEl.textContent = `Page: ${data.page} / ${data.totalPages}`;
	console.log(`Page: ${data.page} / ${data.totalPages}`);

    // Render match rows
    const matchesContainer = document.querySelector<HTMLDivElement>('#matches-container');
    if (!matchesContainer) return;

    if (!data.matches.length) {
      matchesContainer.innerHTML = `<p class="text-center">No matches found.</p>`;
      return;
    }

    const usersMap = data.users || {};

    matchesContainer.innerHTML = data.matches.map(match => {
	const player1 = getUserFromMap(usersMap, match.player1_id);
	const player2 = getUserFromMap(usersMap, match.player2_id);

	    // Normalize avatar URLs (fallback to default if missing)
  	const player1Avatar = player1.avatar
    ? `${API_BASE_URL}/profile/avatar/${player1.avatar}`
    : 'default.jpg';

  	const player2Avatar = player2.avatar
    ? `${API_BASE_URL}/profile/avatar/${player2.avatar}`
    : 'default.jpg';

	// Status logic
	
		let p1StatusColor = "bg-gray-400";
		let p2StatusColor = "bg-gray-400";
		let p1StatusText = "Offline";
		let p2StatusText = "Offline";

		switch (player1.status) {
			case 1:
			p1StatusColor = "bg-[--success-color]";
			p1StatusText = "Online";
			break;
			case 2:
			p1StatusColor = "bg-[--warning-color]";
			p1StatusText = "Inactive";
			break;
		}

		switch (player2.status) {
			case 1:
			p2StatusColor = "bg-[--success-color]";
			p2StatusText = "Online";
			break;
			case 2:
			p2StatusColor = "bg-[--warning-color]";
			p2StatusText = "Inactive";
			break;
		}

    //   const dateStr = match.finished_at ? new Date(match.finished_at).toLocaleDateString() : '';
	const dateStr = match.finished_at
	? (() => {
		const d = new Date(match.finished_at);
		const day = String(d.getDate()).padStart(2, '0');
		const month = String(d.getMonth() + 1).padStart(2, '0'); // months are 0-based
		const year = d.getFullYear();
		return `${day}/${month}/${year}`;
		})()
	: '';

	// Winner highlight logic
	const isPlayer1Winner = match.player1_id === match.winner_id;
	const isPlayer2Winner = match.player2_id === match.winner_id;

	const player1Border = isPlayer1Winner ? "border-[--success-color]" : "border-[--primary-color]";
	const player2Border = isPlayer2Winner ? "border-[--success-color]" : "border-[--primary-color]";

	const player1ScoreColor = isPlayer1Winner ? "color-success" : "color-secondary";
	const player2ScoreColor = isPlayer2Winner ? "color-success" : "color-secondary";
      return `
        <div class="flex justify-between items-center border-2 border-[--primary-color] p-4 gap-4">
          <!-- Player A -->
          <div class="player-card ${player1Border}">
            <a href="#" class="open-profile" data-user="${player1.username}">
              <img class="w-12 h-12 rounded-full bg-gray-300" src="${player1Avatar}" alt="${player1.username}">
            </a>
            <div class="ml-3 flex flex-col">
              <div class="flex items-center space-x-2">
				<!-- Tooltip wrapper -->
				<div class="relative group flex items-center">
				<span id="profile-status" class="w-4 h-4 rounded-full ${p1StatusColor} "></span>
				
				<!-- Tooltip -->
				<div id="status-tootip" class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap 
							rounded-lg bg-gray-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 
							transition-opacity duration-300 z-10">
					${p1StatusText}
				</div>
            </div>
                <span class="font-bold text-white">
                  <a href="#" class="open-profile" data-user="${player1.username}">${player1.username}</a>
                </span>
              </div>
              <div class="text-red-500 font-bold text-sm">${player1.score ?? 0} pts</div>
            </div>
          </div>

          <div class="${player1ScoreColor} text-2xl">${match.player1_score ?? '-'}</div>

          <div class="border-2 border-[--primary-color] px-6 py-2 text-white neon-border">
            ${dateStr}
          </div>

          <div class="${player2ScoreColor} text-2xl">${match.player2_score ?? '-'}</div>

          <!-- Player B -->
          <div class="player-card ${player2Border}">
            <a href="#" class="open-profile" data-user="${player2.username}">
              <img class="w-12 h-12 rounded-full bg-gray-300" src="${player2Avatar}" alt="${player2.username}">
            </a>
            <div class="ml-3 flex flex-col">
              <div class="flex items-center space-x-2">
                <!-- Tooltip wrapper -->
				<div class="relative group flex items-center">
				<span id="profile-status" class="w-4 h-4 rounded-full ${p2StatusColor} "></span>
				
				<!-- Tooltip -->
				<div id="status-tootip" class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap 
							rounded-lg bg-gray-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 
							transition-opacity duration-300 z-10">
					${p2StatusText}
				</div>
			</div>
            <a href="#" class="open-profile" data-user="${player2.username}">
				<span class="font-bold text-white">${player2.username}</span>
			</a>
              </div>
              <div class="text-red-500 font-bold text-sm">${player2.score ?? 0} pts</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Prev / Next buttons (keep behavior)
    const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;

		
	if (prevBtn) {
	const isDisabled = data.page <= 1;
	prevBtn.disabled = isDisabled;
	prevBtn.classList.toggle("btn-primary", !isDisabled);
	prevBtn.classList.toggle("btn-disabled", isDisabled);

	prevBtn.onclick = () => {
		if (!isDisabled) {
		currentPage = data.page - 1;
		loadMatches(userId, currentPage);
		}
	};
	}

	if (nextBtn) {
	const isDisabled = data.page >= data.totalPages;
	nextBtn.disabled = isDisabled;
	nextBtn.classList.toggle("btn-primary", !isDisabled);
	nextBtn.classList.toggle("btn-disabled", isDisabled);

	nextBtn.onclick = () => {
		if (!isDisabled) {
		currentPage = data.page + 1;
		loadMatches(userId, currentPage);
		}
	};
	}

  } catch (err) {
    console.error("Failed to load matches:", err);
    const matchesContainer = document.querySelector<HTMLDivElement>('#matches-container');
    if (matchesContainer) matchesContainer.innerHTML = `<p class="text-red-500">Failed to load matches.</p>`;
  }
}



//Helper for fetch matches with pagination
async function getUserMatches(userId: number, page = 1, perPage = 5) {
  const offset = (page - 1) * perPage;
  const res = await fetch(`${API_BASE_URL}/profile/games/${userId}?limit=${perPage}&offset=${offset}`, {
    credentials: 'include',
    headers: {
      
    }
  });

  if (!res.ok) throw new Error(`Failed to fetch matches: ${res.status}`);
  const data = await res.json();

  // debug: inspect server response when troubleshooting
  console.debug('getUserMatches response:', data);

  return {
    matches: data.matches || [],
    users: (data.users as UsersMap) || {},
    total: typeof data.total === 'number' ? data.total : 0,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil((data.total ?? 0) / perPage))
  };
}
