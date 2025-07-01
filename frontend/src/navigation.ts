import { API_BASE_URL } from './main.js';
import { renderHeader } from './components/Header.js';
import { renderAuthContainer } from './screens/AuthContainer.js';
import { renderHome } from './screens/Home.js';
import { renderGame } from './screens/GameScreen.js';

export async function navigateTo(screen: string) {
	const app = document.getElementById('app')!;
	if (!app) {
		console.error('App container not found!');
		return;
	}
	const header = document.getElementById('header')!;
	if (!header) {
		console.error('Header container not found!');
		return;
	}
	const main = document.getElementById('main')!;
	if (!main) {
		console.error('Main container not found!');
		return;
	}

	main.innerHTML = '';
	if (screen != 'login') {
		renderHeader();
	}
	else
		header.innerHTML = '';

	switch (screen) {
		case 'game':
			renderGame("Jorge", "Miguel", "local");
			break;


		default:
			app.innerHTML = `<p class="text-red-500">Unknown screen: ${screen}</p>`;
	}
}
