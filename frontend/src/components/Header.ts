import { navigateTo } from "../navigation";

export function renderHeader(): void {
	const header = document.getElementById('header');
  	if (!header) return;

	header.innerHTML = `
		<div>
            <!-- Header -->
            <nav class="font-press bg-indigo-900/10 text-white px-6 py-4 flex justify-between items-center">
                <div class="text-lg font-press font-bold tracking-wide flex items-center gap-2">
				<span class="material-symbols-outlined text-3xl">
				swords
				</span> Pong</div>
                <div class="flex gap-2">
                    <button id="nav-home" class="menu-tab text-[--primary-color] hover:bg-indigo-900/30">Play</button>
                    <button id="nav-profile" class="menu-tab text-[--secondary-color] hover:bg-indigo-900/30">Profile</button>
					<button id="nav-leaderboard" class="menu-tab text-[--secondary-color] hover:bg-indigo-900/30">Leaderboard</button>
					<button id="nav-contact" class="menu-tab text-[--secondary-color] hover:bg-indigo-900/30">Contact</button>
                    <button id="nav-logout" class="menu-tab border border-red-600 text-red-600 hover:bg-red-900/20">Logout</button>
                </div>
            </nav>
					<!-- Divider -->
		<div class="relative">
			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-[--secondary-color]"></div>
				</div>
			</div>
		</div>
	        </div>
    `;

	const homeBtn = document.getElementById('nav-home')!;
	homeBtn?.addEventListener('click', () => {
			navigateTo('home');
	});

	const profileBtn = document.getElementById('nav-profile')!;
	profileBtn?.addEventListener('click', () => {
			navigateTo('profile');
	});
	
	const logoutBtn = document.getElementById('nav-logout')!;
	logoutBtn?.addEventListener('click', () => {
		navigateTo('login');
		//disconnect
		//remove token
	});
	const leaderboardBtn = document.getElementById('nav-leaderboard')!;
	leaderboardBtn?.addEventListener('click', () => {
		navigateTo('leaderboard');
		});
}
