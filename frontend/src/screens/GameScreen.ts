import { renderHeader } from "../components/Header";

export function renderGame(playerName: string, opponentName: string, mode: string = 'local'): void {
	const main = document.getElementById('main');
	if (!main) return;

	main.innerHTML = `
	<div class="grid grid-cols-3 items-end w-full max-w-screen-2xl mx-auto pt-6 px-4">

		<!-- Start Controls -->
		<div class="justify-self-start px-4">
			<div class="bg-gray-700/30 flex flex-col rounded-md px-8 py-2 border border-gray-400">
				<div class="font-semibold text-sm text-white">Start/Pause</div>
				<kbd class="px-2 py-0.5 bg-gray-800 rounded border border-gray-500">Space</kbd>
			</div>
			</div>
		
		<!-- Score Center -->
		<div class="justify-self-center flex items-center gap-6">

			<!-- Player 1 Box -->
			<div id="player-box" class="flex flex-col items-center btn-primary rounded-xl px-4 py-3 shadow-md">
			<div class="font-semibold text-sm">${playerName}</div>
			<div id="player-score" class="text-3xl font-extrabold animate-none transition-transform">0</div>
			<div class="font-semibold text-blue-200 text-[0.4rem]">Controls:</div>
				<div class="flex gap-2">
				<kbd class="px-2 py-0.5 bg-gray-800 rounded border border-gray-500">W</kbd>
				<kbd class="px-2 py-0.5 bg-gray-800 rounded border border-gray-500">S</kbd>
				</div>
			</div>

			<!-- VS Center -->
			<div class="flex items-center justify-center">
			<span class="text-gradient bg-gradient-to-r text-[#ffff66] bg-clip-text font-bold text-lg">vs</span>
			</div>

			<!-- Opponent Box -->
			<div id="opponent-box" class="flex flex-col items-center btn-primary rounded-xl px-4 py-3 shadow-md">
			<div class="font-semibold text-sm">${opponentName}</div>
			<div id="opponent-score" class="text-3xl font-extrabold animate-none transition-transform">0</div>
			<div class="font-semibold text-purple-200 text-[0.4rem]">Controls:</div>
			<div class="flex gap-2 justify-end">
				<kbd class="px-2 py-0.5 bg-gray-800 rounded border border-gray-500">↑</kbd>
				<kbd class="px-2 py-0.5 bg-gray-800 rounded border border-gray-500">↓</kbd>
			</div>
			</div>
	</div>
		<div></div>
	</div>
		<!-- Game Canvas -->
		<div class="relative w-full mt-4 px-8 max-w-screen-2xl mx-auto aspect-[21/9] min-h-[300px]">
		<canvas id="pong-canvas" class="w-full aspect-[21/9]" data-mode="${mode}"></canvas>
		<div id="countdown-overlay"
			class="absolute top-0 left-0 w-full h-full flex items-center justify-center text-5xl font-bold text-white bg-black bg-opacity-60 hidden">
		</div>
		<button id="start-button"
			class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded shadow-lg">
			Start Match
		</button>
		</div>
	
	`;
	setupGameEvents();
}

function setupGameEvents(): void { 
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
	if (canvas) {
	const ctx = canvas.getContext('2d');
	ctx!.fillStyle = 'indigo';
	ctx!.fillRect(0, 0, canvas.width, canvas.height);
	}
}
	
