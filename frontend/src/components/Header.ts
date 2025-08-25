import { navigateTo } from "../navigation";
import { AppStore } from "../redux/AppStore";
import { langues, updateLangue } from "../redux/reducers/langueReducer";
import { apiService } from "../services/api.js";
import header_html from "./header.html?raw";

export function renderHeader(): void {
	const header = document.getElementById('header');
  	if (!header)
		return;

	header.innerHTML = header_html;

	  // navegación
	document.getElementById("nav-home")?.addEventListener("click", () => navigateTo("home"));
	document.getElementById("nav-profile")?.addEventListener("click", () => navigateTo("profile"));
	document.getElementById("nav-leaderboard")?.addEventListener("click", () => navigateTo("leaderboard"));
	document.getElementById("nav-contact")?.addEventListener("click", () => navigateTo("contact"));

	const logoutBtn = document.getElementById('nav-logout')!;
	logoutBtn?.addEventListener('click', async () => {
		try {
			await apiService.logout();
			navigateTo('login');
		} catch (error) {
			console.error('Logout error:', error);
			// Even if logout fails, clear local auth state
			apiService.clearAuth();
			navigateTo('login');
		}
	});

	// const langSwitch = document.getElementById("lang-switch") as HTMLSelectElement;
	// limpiar antes (por si se vuelve a renderizar header)
	// langSwitch.innerHTML = "";

	// poblar dinámicamente las opciones
	// langues.forEach((l) => {
	// 	const option = document.createElement("option");
	// 	option.value = l;
	// 	option.textContent = l.toUpperCase();
	// 	langSwitch.appendChild(option);
	// });

	// lang switch
	// langSwitch.value = AppStore.LangueStore.GetState();
	// langSwitch.addEventListener("change", () => {
	// 	AppStore.LangueStore.Dispatch({ type: "CHANGE_LANG", payload: langSwitch.value.toLowerCase() as any });
	// });

	// traducir contenido
	// updateLangue(header, AppStore.LangueStore.GetState());
}
