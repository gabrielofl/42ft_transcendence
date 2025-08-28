import { navigateTo } from "../navigation";
import { apiService } from "../services/api.js";

export function renderFooter(): void {
  const footer = document.getElementById("footer");
  if (!footer) return;

	footer.innerHTML = `
  			<!-- Divider -->
		<div class="relative">
    <footer	class="w-full h-1/10 fixed bottom-0 bg-main border-t border-[--primary-color] font-press text-white px-6 py-4 flex justify-between items-start ">
                <div class="text-lg font-press font-bold tracking-wide flex items-center gap-2">
				<span class="material-symbols-outlined text-3xl">
				swords
				</span> Pong</div>
				
      <div class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
        <!-- Logo + Socials -->
        <div>
          <div class="flex gap-3 text-pink-500 text-xl">
            <a href="#" aria-label="X"><i class="fab fa-x-twitter"></i></a>
            <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
            <a href="#" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
            <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin"></i></a>
          </div>
        </div>

        <!-- Play Game -->
        <div class="text-[--secondary-color] text-xs">
          <h3 class="font-bold mb-2">Play game</h3>
          <ul class="space-y-1">
            <li><a href="#" id="nav-home" class="hover:underline">1p vs 1p</a></li>
            <li><a href="#" class="hover:underline">2p vs 2p</a></li>
            <li><a href="#" class="hover:underline">1p vs AI</a></li>
          </ul>
        </div>

        <!-- User -->
        <div class="text-[--secondary-color] text-xs">
          <h3 class="font-bold mb-2">User</h3>
          <ul class="space-y-1">
            <li><a href="#" id="nav-profile" class="hover:underline">Profile</a></li>
            <li><a href="#" id="nav-logout" class="hover:underline">Leaderboard</a></li>
          </ul>
        </div>

        <!-- Contact -->
        <div class="text-[--secondary-color] text-xs">
          <h3 class="font-bold mb-2 ">Contact</h3>
          <ul class="space-y-1">
            <li><a href="#" class="hover:underline">Contact us</a></li>
            <li><a href="https://github.com" target="_blank" class="hover:underline">Github</a></li>
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

  const profileBtn = document.getElementById("nav-profile");
  profileBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("profile");
  });

  const logoutBtn = document.getElementById("nav-logout");
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
