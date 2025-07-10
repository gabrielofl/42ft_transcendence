import { navigateTo } from "../navigation.js";

interface Player {
id: number;
name: string;
score: number;
isOnline: boolean;
}

const players: Player[] = [
	{ id: 1, name: "David", score: 1200, isOnline: true },
	{ id: 2, name: "Jorge", score: 950, isOnline: false },
	{ id: 3, name: "Miguel", score: 800, isOnline: true },
];

interface Games {
	type: string;
	button: string;
	icon: string;
}
const games: Games[] = [
	{ type: "local", button: "local-btn", icon: "keyboard"},
	{ type: "tournament", button: "tournament-btn", icon: "social_leaderboard" },
	{ type: "ai", button: "ai-btn", icon: "robot" },
	{ type: "multiplayer", button: "multiplayer-btn", icon: "groups_3" }
];

export function renderPlayersPanel(players: Player[]): string {
const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

return `
	<div class="bg-black/40 backdrop-blur-sm rounded-xl p-4 h-2/3 w-full">
	<h3 class="text-md font-semibold mb-4 flex items-center">
		Leaderboard
	</h3>
	<div class="space-y-3">
		${sortedPlayers.map((player, index) => `
		<div class="flex items-center justify-between p-3 hover:bg-yellow-500/40 rounded-lg group ${index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-indigo-800/50'}">
			<div class="flex items-center space-x-3">
			${index === 0 ? `<span class="material-symbols-outlined w-4 h-4 text-yellow-400 transition-transform duration-300 group-hover:-rotate-90 group-hover:scale-125">star</span>` : ''}
			<div class="flex flex-col">
				<span class="font-medium">${player.name}</span>
				<div class="flex items-center space-x-2">
				<div class="w-2 h-2 rounded-full ${player.isOnline ? 'bg-green-400' : 'bg-gray-400'}"></div>
				<span class="text-xs text-gray-400">${player.isOnline ? 'Online' : 'Offline'}</span>
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

export function renderGameOptionsPanel(games: Games[]): string {

return `
	<div class="bg-black/40 rounded-xl p-4 h-2/3 w-full">
	<h3 class="text-md font-semibold font-press mb-4 flex items-center">
		Game Mode
	</h3>
	<div class="space-y-3">
	${games.map(game => `
		<button id="${game.button}"
		class="w-full bg-indigo-800/50 hover:bg-indigo-500 text-left text-sm font-bold font-press rounded-lg p-6 px-4 transition flex items-center gap-2">
		< <span class="material-symbols-outlined"> ${game.icon} </span> ${game.type} >
		</button>
		`).join('')}
		</div>
	</div>
`;
}

export function renderGameStatsPanel(player: PlayerStats): string {

return `
<div class="bg-gray-300/70 rounded-xl p-4 h-2/3 w-full">
		<h3 class="text-md text-gray-900 font-semibold mb-4">Player Statistics</h3>
		
		<div class="grid grid-cols-2 gap-4 text-sm">
			<div class="text-center p-3 bg-gray-800/90 rounded-lg transition-all duration-300 hover:scale-105">
				<div class="text-2xl font-bold text-green-400">${player.wins}</div>
				<div class="text-white text-xs">Wins</div>
			</div>
		<div class="text-center p-3 bg-gray-800/90 rounded-lg transition-all duration-300 hover:scale-105">
			<div class="text-2xl font-bold text-red-400">${player.losses}</div>
			<div class="text-white text-xs">Losses</div>
		</div>
		<div class="text-center p-3 bg-gray-800/90 rounded-lg transition-all duration-300 hover:scale-105">
			<div class="text-2xl font-bold text-yellow-400">${player.ratio}</div>
			<div class="text-white text-xs">W/L Ratio</div>
		</div>
		<div class="text-center p-3 bg-gray-800/90 rounded-lg transition-all duration-300 hover:scale-105">
			<div class="text-2xl font-bold text-blue-400">${player.time}</div>
			<div class="text-white text-xs">Time played</div>
		</div>
		</div>
	</div>
	`;
}

interface PlayerStats {
name: string;
wins: number;
losses: number;
ratio: number;
time: string;
}
const davidStats: PlayerStats = {
name: "David",
wins: 10,
losses: 3,
ratio: 5.0,
time: "12:34"
};

export function renderHome(): void {
	const main = document.getElementById('main');
	if (!main) return;

	main.innerHTML += `
		<div class="min-h-screen grid grid-cols-3 justify-center gap-8 mx-auto p-4">
			${renderPlayersPanel(players)}
			${renderGameOptionsPanel(games)}
			${renderGameStatsPanel(davidStats)}
		</div>
	`;
	setupHome();
}

		// <!-- Avalanche Button -->
		// 	<button id="open-avalanche-dock"
		// 		class="bg-gray-900 hover:bg-red-800 text-white p-2 rounded-lg shadow transition duration-300">
		// 		<img src="/avalanche.svg" alt="Avalanche" class="w-10 h-10" />
		// 	</button>

// <!-- Modes Panel -->
//                 <button id="mode-btn"
//                     class="w-1/4 bg-yellow-900 hover:bg-yellow-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
//                     Choose mode selection button
//                 </button>
//                 <div id="modes-panel"
//                     class="w-[500px] z-20 relative top-0 left-0 h-auto flex flex-col bg-gray-900 text-white shadow-lg border-l border-gray-700 rounded-lg overflow-hidden transform transition-all duration-300 scale-0 origin-left pointer-events-none">
//                     <div>
//                         <button id="close-modes-panel" class="absolute mr-4 mt-4 text-md right-2 text-red-500 hover:text-red-800">&times;</button>
//                     </div>
//                     <div id="modes-panel-content" class="flex justify-center pt-14 pb-8">
//                         <!-- Content injection -->
//                     </div>
//                 </div>
//                 <div class="text-gray-900 font-press text-center text-sm my-3">or</div>

// export function renderModesPanel(): string {
//     return `
//         <div class="flex flex-col items-center justify-center px-4">
//             <button id="local2-btn"
//                 class="w-full bg-yellow-900 hover:bg-yellow-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
//                 Local game
//             </button>
//             <button id="ai2-btn"
//                 class="w-full bg-red-900 hover:bg-red-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
//                 AI game
//             </button>
//             <button id="multiplayer2-btn"
//                 class="w-full bg-green-900 hover:bg-green-600 text-white font-press m-4 py-8 px-4 rounded-lg transition">
//                 Multiplayer game
//             </button>
//         </div>
//     `;
// }

export function setupHome() {
	// const modeBtn = document.getElementById('mode-btn')!;
	const localBtn = document.getElementById('local-btn')!;
	const tournamentBtn = document.getElementById('tournament-btn')!;
	const aiBtn = document.getElementById('ai-btn')!;
	const multiplayerBtn = document.getElementById('multiplayer-btn')!;


	localBtn?.addEventListener('click', async () => {
		// navigateTo('game', type, players);
		navigateTo('game');
	});

	tournamentBtn?.addEventListener('click', async () => {
		navigateTo('tournament');
		// navigateTo('game', type, players);
	});

	aiBtn?.addEventListener('click', async () => {
		// navigateTo('game', type, players);
		navigateTo('game');
	});

	multiplayerBtn?.addEventListener('click', async () => {
		// navigateTo('game', type, players);
		navigateTo('game');
	});

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
