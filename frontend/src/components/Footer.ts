import { navigateTo } from "../navigation";
import { apiService } from "../services/api.js";

export function renderFooter(): void {
  const footer = document.getElementById("footer");
  if (!footer) return;

	footer.innerHTML = `
  			<!-- Divider -->
		<div class="relative">
    <footer	class="w-full h-1/10 fixed bottom-0 bg-main border-t border-[--primary-color] font-press text-white px-6 py-4 flex justify-between items-start ">
			<a href="#" id="nav-home" class="hover:underline">
				<div class="text-lg font-press font-bold tracking-wide flex items-center gap-2">
				<span class="material-symbols-outlined text-3xl">
				swords
				</span> Pong</div>
			</a>
				
      <div class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
        <!-- Logo + Socials -->
      

        <!-- Play Game -->
        <div class="text-[--text-light] text-xs">
          <h3 class="font-bold mb-2">Play game</h3>
          <ul class="space-y-1 text-[--secondary-color]">
            <li><a href="#" id="nav-create-game" class="hover:underline">Create Game</a></li>
            <li><a href="#" id="nav-join-game"class="hover:underline">Join Game</a></li>
            <li><a href="#" id="nav-tournament-game" class="hover:underline">Tournament Mode</a></li>
          </ul>
        </div>

        <!-- User -->
        <div class="text-[--text-light] text-xs">
          <h3 class="font-bold mb-2">User</h3>
          <ul class="space-y-1 text-[--secondary-color]">
            <li><a href="#" id="nav-profile" class="hover:underline">Account</a></li>

            <li><a href="#" id="footer-logout" class="hover:underline">Logout</a></li>
          </ul>
        </div>

        <!-- Contact -->
        <div class="text-[--text-light] text-xs">
          <h3 class="font-bold mb-2 ">Global</h3>
          <ul class="space-y-1  text-[--secondary-color]">
            <li><a href="#" id="nav-leaderboard" class="hover:underline">Leaderboard</a></li>
			
            <li><a href="https://github.com/gabrielofl/42ft_transcendence" target="_blank" class="hover:underline">Github</a></li>
          </ul>
        </div>
      </div>
    </footer>
		</div>

  `;

  const homeBtn = document.getElementById("nav-home");
  homeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("home");
  });
 
  const createGameBtn = document.getElementById("nav-create-game");
  createGameBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("create");
  });

  const joinGameBtn = document.getElementById("nav-join-game");
  joinGameBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo('join');
  });

  const tournamentGameBtn = document.getElementById("nav-tournament-game");
  tournamentGameBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("tournament");
  });

  const profileBtn = document.getElementById("nav-profile");
  profileBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("profile");
  });

    const leaderboardBtn = document.getElementById("nav-leaderboard");
  leaderboardBtn?.addEventListener("click", (e) => {
	e.preventDefault();
	navigateTo("leaderboard");
  });
  
  const logoutBtn = document.getElementById("footer-logout");
  logoutBtn?.addEventListener("click", async (e) => {
	  e.preventDefault();
    try {
		await apiService.logout();
      navigateTo("login");
    } catch (error) {
      console.error('Logout error:', error);
      navigateTo("login");
    }
  });
  
}
