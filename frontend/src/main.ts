// main.ts
import './tailwind.css'; 
import { initNavigation, navigateTo } from './navigation.js';
import { apiService } from './services/api.js';

// export const API_BASE_URL = "https://localhost:4444"; Work on cluster
export const API_BASE_URL = "https://localhost:443";

document.addEventListener('DOMContentLoaded', () => {
	// Check if user is already authenticated
	initNavigation();

	if (apiService.isAuthenticated()) {
		navigateTo('home');
	} else {
		navigateTo('login');
	}
});
