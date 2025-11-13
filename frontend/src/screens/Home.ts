import { navigateTo } from "../navigation.js";
import homeTemplate from "./home.html?raw";

export function renderHome(): void {
	const main = document.getElementById('main');
	if (!main) return;

	main.innerHTML = homeTemplate;
	setupHome();
}

export function setupHome() {
	const createBtn = document.getElementById('create-btn')!;
	const joinBtn = document.getElementById('join-btn')!;
	const tournamentBtn = document.getElementById('tournament-btn')!;

	createBtn?.addEventListener('click', async () => {
		navigateTo('create');
	});

	joinBtn?.addEventListener('click', async () => {
		navigateTo('join');
	});

	tournamentBtn?.addEventListener('click', async () => {
		navigateTo('tournament-lobby');
	});

}
