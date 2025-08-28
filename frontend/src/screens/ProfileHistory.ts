import profileMatchHistory from "./profile-match-history.html?raw";
import { replaceTemplatePlaceholders } from "./utils";
import { setupProfileLinks } from "./ProfileModal";
import { initProfileModal } from "./ProfileModal";

const API_BASE_URL = 'https://localhost:4444/api'; //Work on cluster


export function renderHistoryTab(matches: any[] = [], loading = false): string {
  const rendered = replaceTemplatePlaceholders(profileMatchHistory, { API_BASE_URL });
  return rendered;
}

export async function setupHistoryTab() {
  const container = document.getElementById("profile-content");
  if (!container) return;

  try {
    container.innerHTML = renderHistoryTab([]);
	initProfileModal(); 
    setupProfileLinks();  // wire up modal opening here
  } catch (err) {
    console.error("Failed to load match history:", err);
    container.innerHTML = `<p class="text-red-500">Failed to load match history.</p>`;
  }
}
