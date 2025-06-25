import { API_BASE_URL } from './main.js';
import { renderLogin} from './screens/Login.js';

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
            break;

        default:
            app.innerHTML = `<p class="text-red-500">Unknown screen: ${screen}</p>`;
    }
}
