import { API_BASE_URL } from './main.js';
import { renderLogin, setupLogin } from './screens/Login.js';
import { renderHome, setupHome } from './screens/Home.js';

export async function navigateTo(screen: string) {
	const app = document.getElementById('app')!;
	if (!app) {
		console.error('App container not found!');
		return;
	}

	app.innerHTML = '';

    switch (screen) {
        case 'login':
			app.innerHTML = renderLogin();
			setupLogin();
            break;

		case 'home':
			app.innerHTML = renderHome();
			setupHome();
			break;

        default:
            app.innerHTML = `<p class="text-red-500">Unknown screen: ${screen}</p>`;
    }
}
