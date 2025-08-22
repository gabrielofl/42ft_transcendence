// main.ts
import './tailwind.css'; 
import { navigateTo } from './navigation.js';

export const API_BASE_URL = "https://localhost:443";

document.addEventListener('DOMContentLoaded', () => {
	navigateTo('game');
});
