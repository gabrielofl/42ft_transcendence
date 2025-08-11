import { navigateTo } from "../navigation.js";

export function renderHome(): void {
	const main = document.getElementById('main');
	if (!main) return;

	main.innerHTML = `
	<section class="text-center text-[--secondary-color] font-press px-6  pt-8 py-2 space-y-2">
		<h1 class="text-5xl font-bold text-white">Pong Game</h1>
		<h2 class="text-lg text-yellow-500 pb-4">THE LEGEND RETURNS</h2>
		<p class="text-sm text-[--secondary-color] mx-auto leading-relaxed">
			SMASH BALLS. BEAT FRIENDS. RULE THE RETRO COURT.<br>
			Jump into the arcade classic that started it all. Simple, fast, and endlessly fun!
		</p>

			<h3 class="mt-6 text-[--secondary-color] pt-6">Choose your match:</h3>
		

			<div class="flex flex-col py-4 items-center gap-4">
				<hr class="lg:w-2/5 w-2/3 h-px  bg-secondary border-0">
				<button id="local-btn" class="btn-primary lg:w-1/4 w-2/4 ">1P VS 1P</button>
				<button id="ai-btn" class="btn-primary lg:w-1/4 w-2/4 ">1P VS AI</button>
				<button id="tournament-btn" class="btn-primary lg:w-1/4 w-2/4 ">TOURNAMENT MODE</button>
				<button id="multiplayer-btn" class="btn-primary lg:w-1/4 w-2/4 ">MULTIPLAYER MODE</button>
				<hr class="lg:w-2/5 w-2/3 h-px  bg-secondary border-0">
			</div>
			
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-xs sm:text-sm text-white mt-6 px-6 pt-8  mx-auto ">
				<div>
					<h4 class="text-[--secondary-color] text-xs text-center font-bold mb-2">THE OG PONG VIBES</h4>
					<p class="text-xs">
						A faithful tribute to the first-ever video game sensation, now with a twist. Challenge friends online, face off against a smart AI, customize your map, and unleash wild power-ups. It's classic Pong… leveled up.
					</p>
				</div>
				<div>
					<h4 class="text-[--secondary-color] text-xs text-center font-bold mb-2">PONG: WHERE IT ALL BEGAN</h4>
					<p class="text-xs">
						Born in 1972, Pong sparked the arcade revolution. We're bringing that pixel-perfect feeling back—with style.
					</p>
				</div>
			</div>
		</section>
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
