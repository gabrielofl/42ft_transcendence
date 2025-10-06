import profileMatchHistory from "./profile-friends.html?raw";
import { replaceTemplatePlaceholders } from "./utils";
import { initProfileModal, setupProfileLinks } from "./ProfileModal";
import { API_BASE_URL } from "./config";

// Keep track of current page and perPage
let friendsPerPage = 6;
let friendsCurrentPage = 1;

let requestsPerPage = 6;
let requestsCurrentPage = 1;


export function renderFriendsTab() {
  const container = document.getElementById('profile-content');
	if (!container) return ;
  	try {
		container.innerHTML = replaceTemplatePlaceholders(profileMatchHistory, {API_BASE_URL});
		setupFriendsTab();
	} catch (err) {
    console.error("Failed to load friends:", err);
    container.innerHTML = `<p class="text-red-500">Failed to load friends tab.</p>`;
  	}
}

export async function setupFriendsTab() {
	await loadFriends(friendsCurrentPage, requestsCurrentPage); 
	initProfileModal(); 
    setupProfileLinks(); 
}

async function loadFriends(page: number, requestsPage: number) {
	console.log("LoadFriends");
  try {
	const data = await getUserFriends(page, friendsPerPage);
	const requestData = await getUserFriendsRequests(requestsPage, requestsPerPage);
	const friendsContainer = document.querySelector<HTMLDivElement>('#friends-container');
	if (!friendsContainer) return;
	const requestContainer = document.querySelector<HTMLDivElement>('#request-container');
	if (!requestContainer) return;
	
	const acceptedFriends = data.friends;
	const pendingFriends = requestData.friends;
	// Protect Undefined
	if (!data.onlineCount)
		data.onlineCount = 0;
	if (!data.page)
		data.page = 0;
	if (!data.totalPages)
		data.totalPages = 0;
	if (!requestData.onlineCount)
		requestData.onlineCount = 0;
	if (!requestData.page)
		requestData.page = 0;
	if (!requestData.totalPages)
		requestData.totalPages = 0;
	// Update total friends
	const totalFriendsEl = document.querySelector<HTMLParagraphElement>('#total-friends');
	if (totalFriendsEl) totalFriendsEl.textContent = `Total: ${data.total} | Online: ${data.onlineCount}`;
	
	// Update total request friends
	const totalRequestEl = document.querySelector<HTMLParagraphElement>('#total-request');
	if (totalRequestEl) totalRequestEl.textContent = `Friend requests: ${requestData.total}`;

	// Update page info
	const pageEl = document.querySelector<HTMLParagraphElement>('#page-info');
	if (pageEl) pageEl.textContent = `Page: ${data.page} / ${data.totalPages}`;
	const reqPageEl = document.querySelector<HTMLParagraphElement>('#request-page-info');
	if (reqPageEl) reqPageEl.textContent = `Page: ${requestData.page} / ${requestData.totalPages}`;

	console.log("acceptedFriends.length ", acceptedFriends.length);
	console.log("pendingFriends.length ", pendingFriends.length);



	if (acceptedFriends.length == 0) {
	  friendsContainer.innerHTML = `<p class="text-center">No friends found.</p>`;
	}
	else {
	friendsContainer.innerHTML = acceptedFriends.map(f => {
	const user = f.friend;
	// Normalize avatar URLs
	const friendAvatar = user.avatar
		? `${API_BASE_URL}/profile/avatar/${user.avatar}`
		: 'default.jpg';
	// const friendAvatar = user.avatar
	// 	? `${API_BASE_URL}/profile/avatar/${user.avatar}`
	// 	: 'default.jpg';
	// Status logic
	let friendStatusColor = "bg-gray-400";
	let friendStatusText = "Offline";

	switch (user.status) {
		case 1:
		friendStatusColor = "bg-[--success-color]";
		friendStatusText = "Online";
		break;
		case 2:
		friendStatusColor = "bg-[--warning-color]";
		friendStatusText = "Inactive";
		break;
	}

	return `
		<div class="w-full player-card border-[--primary-color]">
		<a href="#" class="open-profile" data-user="${user.username}">
			<img id="user-card-avatar" class="w-12 h-12 rounded-full bg-gray-300" src="${friendAvatar}" alt="Avatar image">
		</a>
		<div class="ml-3 flex flex-col">
			<div class="flex items-center space-x-2">
			<div class="relative group flex items-center">
				<span id="profile-status" class="w-4 h-4 rounded-full ${friendStatusColor} "></span>
				<div id="status-tootip" class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap 
					rounded-lg bg-gray-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 
					transition-opacity duration-300 z-10">
				${friendStatusText}
				</div>
			</div>
			<span id="user-card-username" class="font-bold text-white ">
				<a href="#" class="open-profile" data-user="${user.username}">${user.username}</a>
			</span>
			</div>
			<div id="user-card-points" class="text-red-500 font-bold text-sm ">${user.score ?? 0} pts</div>
		</div>
		</div>
	`;
	}).join('');}
	

	if (!pendingFriends.length) {
	  requestContainer.innerHTML = `<p class="text-center">No new friends request.</p>`;
	  
	}
	else {
	requestContainer.innerHTML = pendingFriends.map(f => {
	const reqUser = f.friend;
	const reqFriendAvatar = reqUser.avatar
		? `${API_BASE_URL}/profile/avatar/${reqUser.avatar}`
		: 'default.jpg';

	// Status logic
	let friendStatusColor = "bg-gray-400";
	let friendStatusText = "Offline";

	switch (reqUser.status) {
		case 1:
		friendStatusColor = "bg-[--success-color]";
		friendStatusText = "Online";
		break;
		case 2:
		friendStatusColor = "bg-[--warning-color]";
		friendStatusText = "Inactive";
		break;
	}

	return `
		<div class="player-card border-[--primary-color]">
		<a href="#" class="open-profile" data-user="${reqUser.username}">
			<img id="user-card-avatar" class="w-12 h-12 rounded-full bg-gray-300" src="${reqFriendAvatar}" alt="Avatar image">
		</a>
		<div class="ml-3 flex flex-col">
			<div class="flex items-center space-x-2">
			<div class="relative group flex items-center">
				<span id="profile-status" class="w-4 h-4 rounded-full ${friendStatusColor} "></span>
				<div id="status-tootip" class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap 
					rounded-lg bg-gray-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 
					transition-opacity duration-300 z-10">
				${friendStatusText}
				</div>
			</div>
			<span id="user-card-username" class="font-bold text-white ">
				<a href="#" class="open-profile" data-user="${reqUser.username}">${reqUser.username}</a>
			</span>
			</div>
			<div id="user-card-points" class="text-red-500 font-bold text-sm ">${reqUser.score ?? 0} pts</div>
		</div>
		</div>
	`;
	}).join('');}

	// Prev / Next buttons (keep behavior)
	const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement | null;
	const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;
	const requestPrevBtn = document.getElementById('request-prev-btn') as HTMLButtonElement | null;
	const requestNnextBtn = document.getElementById('request-next-btn') as HTMLButtonElement | null;

	// Friends buttons
	setupPagination(prevBtn, nextBtn, data.page, data.totalPages, (newPage) => {
	friendsCurrentPage = newPage;
	loadFriends(friendsCurrentPage, requestsCurrentPage);
	});

	setupPagination(requestPrevBtn, requestNnextBtn, requestData.page, requestData.totalPages, (newPage) => {
	requestsCurrentPage = newPage;
	loadFriends(friendsCurrentPage, requestsCurrentPage);
	});
	

  } catch (err) {
	console.error("Failed to load friends:", err);
	const friendsContainer = document.querySelector<HTMLDivElement>('#friends-container');
	if (friendsContainer) friendsContainer.innerHTML = `<p class="text-red-500">Failed to load friends.</p>`;
  }
}

// Helper for fetch friends with pagination
async function getUserFriends(page = 1, perPage = 5) {
  const offset = (page - 1) * perPage;
  const res = await fetch(`${API_BASE_URL}/profile/friends?limit=${perPage}&offset=${offset}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to fetch friends");
  return res.json();
}

// Helper for fetch friend requests with pagination
async function getUserFriendsRequests(page = 1, perPage = 5) {
  const offset = (page - 1) * perPage;
  const res = await fetch(`${API_BASE_URL}/profile/friends/requests?limit=${perPage}&offset=${offset}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to fetch friend requests");
  return res.json();
}

function setupPagination(btnPrev: HTMLButtonElement | null, btnNext: HTMLButtonElement | null, page: number, totalPages: number, onChange: (newPage: number) => void) {
  if (btnPrev) {
    const isDisabled = page <= 1;
    btnPrev.disabled = isDisabled;
    btnPrev.classList.toggle("btn-primary", !isDisabled);
    btnPrev.classList.toggle("btn-disabled", isDisabled);
    btnPrev.onclick = () => { if (!isDisabled) onChange(page - 1); };
  }

  if (btnNext) {
    const isDisabled = page >= totalPages;
    btnNext.disabled = isDisabled;
    btnNext.classList.toggle("btn-primary", !isDisabled);
    btnNext.classList.toggle("btn-disabled", isDisabled);
    btnNext.onclick = () => { if (!isDisabled) onChange(page + 1); };
  }
}


//   if (!res.ok) throw new Error(`Failed to fetch friends: ${res.status}`);
//   const data = await res.json();

//   // debug: inspect server response when troubleshooting
//   console.debug('getUserFriends response:', data);

//   return {
// 	friends: data.friends || [],
// 	users: (data.users as UsersMap) || {},
// 	total: typeof data.total === 'number' ? data.total : 0,
// 	currentUserId: data.currentUserId,
// 	page,
// 	perPage,
// 	totalPages: Math.max(1, Math.ceil((data.total ?? 0) / perPage))
//   };
// }
