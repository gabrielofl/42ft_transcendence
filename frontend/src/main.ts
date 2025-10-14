import './tailwind.css';
import { initNavigation } from './navigation.js';
import { apiService } from './services/api.js';
import { onlinePlayers } from './services/online';

document.addEventListener('DOMContentLoaded', async () => {
  const authed = await apiService.isAuthenticated();
  if (!authed) {
    if (location.hash !== '#login') location.hash = 'login';
  } else {
    if (!location.hash) location.hash = 'home';
    onlinePlayers.init();
  }
  initNavigation();
});
