import profileMatchHistory from "./profile-friends.html?raw";
import { replaceTemplatePlaceholders } from "./utils";
import { initProfileModal, setupProfileLinks } from "./ProfileModal";
import { API_BASE_URL } from "./config";

// Keep track of current page and perPage
// let currentPage = 1;
// const perPage = 5;
let friendsPerPage = 10;
let friendsCurrentPage = 1;

let requestsPerPage = 10;
let requestsCurrentPage = 1;
import { UsersMap, getUserFromMap } from "./ProfileHistory";


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
	await loadFriends(currentPage); 
	initProfileModal(); 
    setupProfileLinks(); 
}

async function loadFriends(page: number) {
  try {
	const data = await getUserFriends(page, perPage);
	const requestData = await getUserFriendsRequests(page, perPage);
	// Render friend cards
	const friendsContainer = document.querySelector<HTMLDivElement>('#friends-container');
	if (!friendsContainer) return;
	// Render request friend cards
	const requestContainer = document.querySelector<HTMLDivElement>('#request-container');
	if (!requestContainer) return;
	
	const acceptedFriends = data.friends;
	const pendingFriends = requestData.friends;

	// Update total friends
	const totalFriendsEl = document.querySelector<HTMLParagraphElement>('#total-friends');
	if (totalFriendsEl) totalFriendsEl.textContent = `Friends: ${acceptedFriends.length}`;
	
	// Update total request friends
	const totalRequestEl = document.querySelector<HTMLParagraphElement>('#total-request');
	if (totalRequestEl) totalRequestEl.textContent = `Friend requests: ${pendingFriends.length}`;

	// Update page info
	const pageEl = document.querySelector<HTMLParagraphElement>('#page-info');
	if (pageEl) pageEl.textContent = `Page: ${data.page} / ${data.totalPages}`;

	if (!acceptedFriends.length) {
	  friendsContainer.innerHTML = `<p class="text-center">No friends found.</p>`;
	  return;
	}

	if (!pendingFriends.length) {
	  requestContainer.innerHTML = `<p class="text-center">No new friends request.</p>`;
	  return;
	}
	console.log("Accepted ", acceptedFriends);
	friendsContainer.innerHTML = acceptedFriends.map(f => {
	const user = f.friend;
	// Normalize avatar URLs
	const friendAvatar = user.avatar
		? `${API_BASE_URL}/profile/avatar/${user.avatar}`
		: 'default.jpg';
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
		<div class="player-card border-[--primary-color]">
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
	}).join('');
	
	requestContainer.innerHTML = pendingFriends.map(f => {
	const user = f.friend;
	// Normalize avatar URLs
	const friendAvatar = user.avatar
		? `${API_BASE_URL}/profile/avatar/${user.avatar}`
		: 'default.jpg';
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
		<div class="player-card border-[--primary-color]">
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
		loadFriends(currentPage);
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
		loadFriends(currentPage);
		}
	};
	}

  } catch (err) {
	console.error("Failed to load friends:", err);
	const friendsContainer = document.querySelector<HTMLDivElement>('#friends-container');
	if (friendsContainer) friendsContainer.innerHTML = `<p class="text-red-500">Failed to load friends.</p>`;
  }
}


//Helper for fetch friends with pagination
async function getUserFriends(page = 1, perPage = 5) {
  const offset = (page - 1) * perPage;
  const res = await fetch(`${API_BASE_URL}/profile/friends?limit=${perPage}&offset=${offset}`, {
	credentials: 'include',
	headers: {
	  
	}
  });

//Helper for fetch friend requests with pagination
async function getUserFriendsRequests(page = 1, perPage = 5) {
  const offset = (page - 1) * perPage;
  const res = await fetch(`${API_BASE_URL}/profile/friends/requests?limit=${perPage}&offset=${offset}`, {
	credentials: 'include',
	headers: {
	  
	}
  });

  if (!res.ok) throw new Error(`Failed to fetch friends: ${res.status}`);
  const data = await res.json();

  // debug: inspect server response when troubleshooting
  console.debug('getUserFriends response:', data);

  return {
	friends: data.friends || [],
	users: (data.users as UsersMap) || {},
	total: typeof data.total === 'number' ? data.total : 0,
	currentUserId: data.currentUserId,
	page,
	perPage,
	totalPages: Math.max(1, Math.ceil((data.total ?? 0) / perPage))
  };
}
