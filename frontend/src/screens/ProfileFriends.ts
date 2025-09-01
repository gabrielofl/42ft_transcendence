import profileMatchHistory from "./profile-friends.html?raw";
import { replaceTemplatePlaceholders } from "./utils";
import { initProfileModal, setupProfileLinks } from "./ProfileModal";
import { API_BASE_URL } from "./config";


export function renderFriendsTab(matches: any[] = [], loading = false) {
  const container = document.getElementById('profile-content');
	if (!container) return ;
  	try {
		container.innerHTML = replaceTemplatePlaceholders(profileMatchHistory, {API_BASE_URL});
		setupFriendsTab();
	} catch (err) {
    console.error("Failed to load account:", err);
    container.innerHTML = `<p class="text-red-500">Failed to load account tab.</p>`;
  	}
}

export async function setupFriendsTab() {

	initProfileModal(); 
    setupProfileLinks(); 
}
