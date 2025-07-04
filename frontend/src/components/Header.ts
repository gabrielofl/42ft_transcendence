import { navigateTo } from "../navigation";

export function renderHeader(): void {
	const header = document.getElementById('header');
  	if (!header) return;

	header.innerHTML = `
		<div>
            <!-- Header -->
            <nav class="font-press bg-indigo-900/10 text-indigo-600 px-6 py-4 flex justify-between rounded-sm items-center shadow-md">
                <div class="text-lg font-press font-bold tracking-wide flex items-center gap-2">
				<span class="material-symbols-outlined text-3xl">
				sports_esports
				</span> ft_transcendence</div>
                <div class="flex gap-2">
                    <button id="nav-home" class="menu-tab border border-indigo-700 hover:bg-indigo-900/30">Home</button>
                    <button id="nav-profile" class="menu-tab border border-indigo-700 hover:bg-indigo-900/30">User</button>
                    <button id="nav-logout" class="menu-tab border border-red-600 text-red-600 hover:bg-red-900/20">Logout</button>
                </div>
            </nav>
	        </div>
    `;

	const homeBtn = document.getElementById('nav-home')!;
	// homeBtn?.addEventListener('click', () => {
	// 		navigateTo('home');
	// });
	
	const logoutBtn = document.getElementById('nav-logout')!;
	// logoutBtn?.addEventListener('click', () => {
	// 	navigateTo('login');
		//disconnect
		//remove token
		// });
}
