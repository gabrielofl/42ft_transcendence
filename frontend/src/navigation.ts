import { API_BASE_URL } from './main.js';
import { renderHeader } from './components/Header.js';
import { renderFooter } from './components/Footer.js';
import { renderAuthContainer } from './screens/AuthContainer.js';
import { renderHome } from './screens/Home.js';
import { renderGame } from './screens/Game/GameScreen.js';
import { renderTournament } from './screens/Tournament.js';
import { renderProfile } from './screens/Profile.js';
import { renderLeaderboard } from './screens/Leaderboard.js';

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
	const footer = document.getElementById('footer')!;
	if (!footer) {
		console.error('Footer container not found!');
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
		renderFooter();
	}
	else { 
		header.innerHTML = '';
		footer.innerHTML = '';
	}

	switch (screen) {
		case 'game':
			renderGame("Jorge", "Miguel", "local");
			break;
		
		case 'tournament':
			renderTournament();
			break;
		
		case 'profile':
			renderProfile();
			break;

		case 'leaderboard':
			renderLeaderboard();
			break;
		
		default:
			app.innerHTML = `<p class="text-red-500">Unknown screen: ${screen}</p>`;
	}
}
