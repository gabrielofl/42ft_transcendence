import profileMatchHistory from "./profile-match-history.html?raw";
import { replaceTemplatePlaceholders } from "./utils";
import { initProfileModal, setupProfileLinks } from "./ProfileModal";
import { API_BASE_URL } from "./config";

// Keep track of current page and perPage
let currentPage = 1;
const perPage = 5;


// Add to utils?
async function getCurrentUser() {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
  return res.json(); // { id, username, ... }
}



export async function renderHistoryTab() {
  const container = document.getElementById('profile-content');
	if (!container) return ;
  	try {
		container.innerHTML = replaceTemplatePlaceholders(profileMatchHistory, {API_BASE_URL});
		// Fetch current user
		 const res = await getCurrentUser();
		 const me = await res.json();
		 const userId = me.id;
		
		setupHistoryTab(userId);
	} catch (err) {
    console.error("Failed to load account:", err);
    container.innerHTML = `<p class="text-red-500">Failed to load Match History tab.</p>`;
  	}
}

export async function setupHistoryTab(userId: number) {
	
	// Load first page
	loadMatches(userId, currentPage); 
	initProfileModal(); 
    setupProfileLinks(); 
}

// async function loadMatches(userId: number, page: number) {
//   try {
//     const data = await getUserMatches(userId, page, perPage);

//     // Update total matches
//     const totalMatchesEl = document.querySelector<HTMLParagraphElement>(
//       '#profile-content p.txt-subheading'
//     );
//     if (totalMatchesEl) totalMatchesEl.textContent = `Number of matches played: ${data.total}`;

//     // Update page info
//     const pageEl = document.querySelector<HTMLParagraphElement>('#profile-content p.page-info');
//     if (pageEl) pageEl.textContent = `Page: ${data.page} / ${data.totalPages}`;

//     // Render match rows
//     const matchesContainer = document.querySelector<HTMLDivElement>('#matches-container');
//     if (!matchesContainer) return;

//     matchesContainer.innerHTML = data.matches.map(match => {
//       const player1 = data.users[match.player1_id];
//       const player2 = data.users[match.player2_id];

//       return `
//         <div class="flex justify-between items-center border-2 border-[--primary-color] p-4 gap-4">
//           <!-- Player A -->
//           <div class="player-card border-[--success-color]">
//             <a href="#" class="open-profile" data-user="${player1.username}">
//               <img class="w-12 h-12 rounded-full bg-gray-300" src="${player1.avatar}" alt="">
//             </a>
//             <div class="ml-3 flex flex-col">
//               <div class="flex items-center space-x-2">
//                 <span class="w-3 h-3 rounded-full bg-[--success-color]"></span>
//                 <span class="font-bold text-white">
//                   <a href="#" class="open-profile" data-user="${player1.username}">${player1.username}</a>
//                 </span>
//               </div>
//               <div class="text-red-500 font-bold text-sm">${player1.score} pts</div>
//             </div>
//           </div>

//           <div class="color-success text-2xl">${match.player1_score}</div>

//           <div class="border-2 border-[--primary-color] px-6 py-2 text-white neon-border">
//             ${new Date(match.date).toLocaleDateString()}
//           </div>

//           <div class="color-secondary text-2xl">${match.player2_score}</div>

//           <!-- Player B -->
//           <div class="player-card border-[--primary-color]">
//             <a href="#" class="open-profile" data-user="${player2.username}">
//               <img class="w-12 h-12 rounded-full bg-gray-300" src="${player2.avatar}" alt="">
//             </a>
//             <div class="ml-3 flex flex-col">
//               <div class="flex items-center space-x-2">
//                 <span class="w-3 h-3 rounded-full bg-[--warning-color]"></span>
//                 <span class="font-bold text-white">${player2.username}</span>
//               </div>
//               <div class="text-red-500 font-bold text-sm">${player2.score} pts</div>
//             </div>
//           </div>
//         </div>
//       `;
//     }).join('');

//     // Setup Prev/Next buttons
//     const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
//     const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;

//     if (prevBtn) {
//       prevBtn.disabled = data.page <= 1;
//       prevBtn.onclick = () => {
//         currentPage = data.page - 1;
//         loadMatches(userId, currentPage);
//       };
//     }

//     if (nextBtn) {
//       nextBtn.disabled = data.page >= data.totalPages;
//       nextBtn.onclick = () => {
//         currentPage = data.page + 1;
//         loadMatches(userId, currentPage);
//       };
//     }

//   } catch (err) {
//     console.error("Failed to load matches:", err);
//   }
// }
async function loadMatches(userId: number, page: number) {
  try {
    const data = await getUserMatches(userId, page, perPage);

    console.debug('loadMatches data:', data); // helpful while debugging

    // Update total matches
    const totalMatchesEl = document.querySelector<HTMLParagraphElement>('#profile-content p.txt-subheading');
    if (totalMatchesEl) totalMatchesEl.textContent = `Number of matches played: ${data.total}`;

    // Update page info
    const pageEl = document.querySelector<HTMLParagraphElement>('#profile-content p.page-info');
    if (pageEl) pageEl.textContent = `Page: ${data.page} / ${data.totalPages}`;

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

      const dateStr = match.date ? new Date(match.date).toLocaleDateString() : '';

      return `
        <div class="flex justify-between items-center border-2 border-[--primary-color] p-4 gap-4">
          <!-- Player A -->
          <div class="player-card border-[--success-color]">
            <a href="#" class="open-profile" data-user="${player1.username}">
              <img class="w-12 h-12 rounded-full bg-gray-300" src="${player1.avatar}" alt="${player1.username}">
            </a>
            <div class="ml-3 flex flex-col">
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-[--success-color]"></span>
                <span class="font-bold text-white">
                  <a href="#" class="open-profile" data-user="${player1.username}">${player1.username}</a>
                </span>
              </div>
              <div class="text-red-500 font-bold text-sm">${player1.score ?? 0} pts</div>
            </div>
          </div>

          <div class="color-success text-2xl">${match.player1_score ?? '-'}</div>

          <div class="border-2 border-[--primary-color] px-6 py-2 text-white neon-border">
            ${dateStr}
          </div>

          <div class="color-secondary text-2xl">${match.player2_score ?? '-'}</div>

          <!-- Player B -->
          <div class="player-card border-[--primary-color]">
            <a href="#" class="open-profile" data-user="${player2.username}">
              <img class="w-12 h-12 rounded-full bg-gray-300" src="${player2.avatar}" alt="${player2.username}">
            </a>
            <div class="ml-3 flex flex-col">
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-[--warning-color]"></span>
                <span class="font-bold text-white">${player2.username}</span>
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
      prevBtn.disabled = data.page <= 1;
      prevBtn.onclick = () => {
        currentPage = data.page - 1;
        loadMatches(userId, currentPage);
      };
    }
    if (nextBtn) {
      nextBtn.disabled = data.page >= data.totalPages;
      nextBtn.onclick = () => {
        currentPage = data.page + 1;
        loadMatches(userId, currentPage);
      };
    }

  } catch (err) {
    console.error("Failed to load matches:", err);
    const matchesContainer = document.querySelector<HTMLDivElement>('#matches-container');
    if (matchesContainer) matchesContainer.innerHTML = `<p class="text-red-500">Failed to load matches.</p>`;
  }
}

type UsersMap = Record<string, {
  id: number;
  username: string;
  avatar?: string;
  score?: number;
  status?: number;
  show_scores_publicly?: number;
  // add other fields you return from backend
}>;

const DEFAULT_AVATAR = `${API_BASE_URL}/uploads/avatars/default-avatar.png`; // replace with your default

function getUserFromMap(usersMap: UsersMap, id: number) {
  // JSON object keys become strings, so try both forms
  return usersMap[id] ?? usersMap[String(id)] ?? {
    id,
    username: 'Unknown',
    avatar: DEFAULT_AVATAR,
    score: 0,
    status: 0,
  	show_scores_publicly: 1
  };
}


//Helper for fetch matches with pagination
async function getUserMatches(userId: number, page = 1, perPage = 5) {
  const offset = (page - 1) * perPage;
  const res = await fetch(`${API_BASE_URL}/games/${userId}?limit=${perPage}&offset=${offset}`, {
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
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



// async function getUserMatches(userId: number, page = 1, perPage = 5) {
//   const offset = (page - 1) * perPage;
//   const res = await fetch(`${API_BASE_URL}/profile/games/${userId}?limit=${perPage}&offset=${offset}`, {
//     credentials: 'include',
//     headers: {
//       'Authorization': `Bearer ${localStorage.getItem('token')}`
//     }
//   });

//   if (!res.ok) throw new Error(`Failed to fetch matches: ${res.status}`);
//   const data = await res.json();

//   return {
//     matches: data.matches,
//     total: data.total,
//     page,
//     perPage,
//     totalPages: Math.ceil(data.total / perPage)
//   };
// }
