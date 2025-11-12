
import sidebar from "../screens/profile-sidebar.html?raw";
import { renderAccountTab } from "../screens/ProfileAccount";
import { renderPerformanceTab } from "../screens/ProfilePerformance";
import { renderHistoryTab } from "../screens/ProfileHistory";
import { renderFriendsTab } from "../screens/ProfileFriends";
import { renderFooter } from "../components/Footer.js";
import { renderHeader } from "../components/Header.js";

export function setupProfileSidebar() {
  const sidebar = document.getElementById("profile-sidebar");
  if (!sidebar)
	return;

	renderFooter();
	renderHeader();

  // Configurar eventos de tabs
  sidebar.querySelectorAll(".sidebar-tab").forEach(btn => {
	btn.addEventListener("click", async e => {
	  const tab = (e.currentTarget as HTMLElement).dataset.tab;
	  const container = document.getElementById("profile-content");
	  if (!container)
		return;

	  // Reset de clases activas
	  sidebar.querySelectorAll(".sidebar-tab").forEach(b =>
		b.classList.remove("active")
	  );
	  (e.currentTarget as HTMLElement).classList.add("active");

	  switch (tab) {
		case "friends":
		  await renderFriendsTab();
		  break;
		case "performance":
		  await renderPerformanceTab();
		  break;
		case "history":
		  await renderHistoryTab();
		  break;
		default:
		  await renderPerformanceTab();
		//   await renderAccountTab();
		  break;
	  }
	});
  });
}

export function renderProfile() {
const main = document.getElementById('main');
  if (!main) return;

  main.innerHTML = `
	<div class="flex p-10 text-white font-press mx-auto shadow-lg min-h-[600px] max-h-[720px] h-full">
		<!-- Sidebar -->
		${sidebar}
  
		<!-- Main Content -->
		<div class="flex-1 px-4 h-9/10" id="profile-content">
		  <!-- Dynamic content will be injected here -->
		</div>
	  </div>
	`;
	setupProfileSidebar();
	setTimeout(() => {
	    document.querySelector('[data-tab="account"]')?.dispatchEvent(new Event('click'));
  	}, 0);

}

document.addEventListener('DOMContentLoaded', () => {
  renderProfile();
  setTimeout(() => {
    document.querySelector('[data-tab="account"]')?.dispatchEvent(new Event('click'));
  }, 0);
});
