// main.ts
import './tailwind.css'; 
import { initNavigation } from './navigation.js';
import { apiService } from './services/api.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!apiService.isAuthenticated()) {
    if (location.hash !== '#login') location.hash = 'login';
  } else {
    if (!location.hash) location.hash = 'home';
  }

  initNavigation();
});
