import { navigateTo } from "../navigation.js";
import homeTemplate from "./home.html?raw";

export function renderHome(): void {
	const main = document.getElementById('main');
	if (!main) return;

	main.innerHTML = homeTemplate;
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
//                         <button id="close-modes-panel" class="absolute mr-4 mt-4 text-sm right-2 text-red-500 hover:text-red-800">&times;</button>
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
	const createBtn = document.getElementById('create-btn')!;
	const joinBtn = document.getElementById('join-btn')!;
	const tournamentBtn = document.getElementById('tournament-btn')!;

	createBtn?.addEventListener('click', async () => {
		// Selección de mapa y configuración.
		navigateTo('create');
	});

	joinBtn?.addEventListener('click', async () => {
		// Lógica para juego remoto
		navigateTo('join');
	});

	tournamentBtn?.addEventListener('click', async () => {
		navigateTo('tournament');
		// navigateTo('game', type, players);
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
