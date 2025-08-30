// main.ts
import './tailwind.css'; 
import { initNavigation, navigateTo } from './navigation.js';
import { apiService } from './services/api.js';

// export const API_BASE_URL = "https://localhost:4444"; Work on cluster
export const API_BASE_URL = "https://localhost:443";

document.addEventListener('DOMContentLoaded', () => {
	// Initialize navigation system
	initNavigation();

	// Only redirect to login if not authenticated
	if (!apiService.isAuthenticated()) {
		navigateTo('login');
	}
	// If authenticated, let initNavigation() handle the current URL hash
});
