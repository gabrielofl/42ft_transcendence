// main.ts
import './tailwind.css'; 
import { navigateTo } from './navigation.js';
import { apiService } from './services/api.js';

// export const API_BASE_URL = "https://localhost:4444"; Work on cluster
export const API_BASE_URL = "https://localhost:443";

document.addEventListener('DOMContentLoaded', () => {
	// Check if user is already authenticated
	if (apiService.isAuthenticated()) {
		navigateTo('profile');
		// navigateTo('home');
	} else {
		navigateTo('login');
	}
});
