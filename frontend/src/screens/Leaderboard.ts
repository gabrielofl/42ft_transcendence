import { apiService } from "../services/api.js";

interface Player {
	id: number;
	username: string;
	score: number;
	status: number; // 0 = offline, 1 = online
	avatar?: string;
}

export function renderPlayersPanel(players: Player[]): string {
	// Players already sorted by score from backend
	return `
		<div class="bg-black/40 backdrop-blur-sm rounded-xl p-4 w-full">
		<h3 class="text-md font-semibold mb-4 flex items-center">
			Leaderboard
		</h3>
		<div class="space-y-3">
			${players.length === 0 ? `
				<div class="text-center text-gray-400 py-4">
					No players yet
				</div>
			` : players.map((player, index) => `
			<div class="flex items-center justify-between p-3 hover:bg-yellow-500/40 rounded-lg group ${index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-indigo-800/50'}">
				<div class="flex items-center space-x-3">
				${index === 0 ? `<span class="material-symbols-outlined w-4 h-4 text-yellow-400 transition-transform duration-300 group-hover:-rotate-90 group-hover:scale-125">star</span>` : ''}
				<div class="flex flex-col">
					<span class="font-medium">${player.username}</span>
					<div class="flex items-center space-x-2">
					<div class="w-2 h-2 rounded-full ${player.status === 1 ? 'bg-green-400' : 'bg-gray-400'}"></div>
					<span class="text-xs text-gray-400">${player.status === 1 ? 'Online' : 'Offline'}</span>
					</div>
				</div>
				</div>
				<div class="text-right">
				<div class="text-[0.6rem] text-gray-300">Rank #${index + 1}</div>
				<div class="font-bold text-sm">${player.score.toLocaleString()} pts.</div>
				</div>
			</div>
			`).join('')}
		</div>
		</div>
	`;
}

export async function renderLeaderboard(): Promise<void> {
	const main = document.getElementById('main');
	if (!main) return;

	try {
		// Fetch leaderboard data from API
		// const players = await apiService.getLeaderboard(10); // Get top 10 players
		const players = await apiService.getLeaderboard(); // Get all users (no limit parameter)
		
		main.innerHTML += `
			<div class="grid grid-cols-3 justify-center gap-8 mx-auto p-4">
				${renderPlayersPanel(players)}
			</div>
		`;
		setupLeaderboard();
	} catch (error) {
		console.error('Error loading leaderboard:', error);
		main.innerHTML += `
			<div class="grid grid-cols-3 justify-center gap-8 mx-auto p-4">
				<div class="bg-black/40 backdrop-blur-sm rounded-xl p-4 w-full">
					<div class="text-center text-red-400 py-4">
						Error loading leaderboard. Please try again later.
					</div>
				</div>
			</div>
		`;
	}
}

export function setupLeaderboard() {


	// const panels = ['modes-panel'];
	// function closeAllPanels() {
	//     panels.forEach((panelId) => {
	//         const panel = document.getElementById(panelId)!;
	//         const content = panel.querySelector('.content') as HTMLElement | null;
	//         panel.classList.remove('active', 'scale-100');
	//         panel.classList.add('scale-0');
	//         if (content) content.innerHTML = '';
	//     });

	//     document.body.classList.remove('panel-open');
	// }
	
	// function openPanel(panelId: string, contentId: string, html: string) {
	//     closeAllPanels();

	//     const panel = document.getElementById(panelId)!;
	//     const content = document.getElementById(contentId)!;

	//     content.innerHTML = html;
	//     panel.classList.add('active');
	// 	panel.classList.remove('scale-0', 'pointer-events-none');

	//     document.body.classList.add('panel-open');
	// }

	// function closePanelFunc(panelId: string, contentId: string) {
	//     const panel = document.getElementById(panelId)!;
	//     const content = document.getElementById(contentId)!;

	// 	panel.classList.remove('active');
	// 	panel.classList.add('scale-0', 'pointer-events-none');
	//     content.innerHTML = '';

	//     document.body.classList.remove('panel-open');
	// }

	// modeBtn?.addEventListener('click', async () => {
	// 	openPanel('modes-panel', 'modes-panel-content', renderModesPanel());
	// });

	// document.getElementById('close-modes-panel')?.addEventListener('click', () => {
	// 	closePanelFunc('modes-panel', 'modes-panel-content');
	// });
}
