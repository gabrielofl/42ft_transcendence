import { renderHeader } from "../components/Header";

export function renderGame(playerName: string, opponentName: string, mode: string = 'local'): void {
	const main = document.getElementById('main');
	if (!main) return;

	main.innerHTML = `
	<div class="w-full max-w-screen-xl mx-auto px-4 pt-6 flex flex-col gap-8 text-white">

		<!-- Top Row: Player Boxes + Give Up + Timer -->
		<div class="w-full grid grid-cols-3 gap-8 items-start">

			<!-- Player 1 -->
			<div class="flex flex-col gap-2 w-full">
				<div class="flex items-center justify-between w-full border border-[--secondary-color] rounded px-4 py-2 shadow">
					<div class="w-6 h-6 rounded-full bg-white"></div>
					<div class="flex-1 text-center">
						<div class="font-bold">${playerName.toUpperCase()}</div>
						<div class="text-[--primary-color] text-xs">1258 pts</div>
					</div>
					<div class="text-sm font-bold">R</div>
				</div>
				<div class="flex items-center justify-center gap-2 px-4 py-2 border border-[--primary-color] rounded shadow text-sm font-bold uppercase">
					<span>Controls</span>
					<kbd class="border border-[--secondary-color] px-2 py-0.5 rounded">W</kbd>
					<kbd class="border border-[--secondary-color] px-2 py-0.5 rounded">S</kbd>
				</div>
			</div>

			<!-- Center Controls -->
			<div class="flex flex-col items-center gap-2 w-full justify-self-center">
				<button class="px-6 py-1 btn-primary rounded shadow border border-[--secondary-color] text-white font-bold">
					Give Up
				</button>
				<div class="text-xs uppercase tracking-wide">Time</div>
				<div class="text-xl font-bold" id="match-timer">01:37</div>
			</div>

			<!-- Player 2 -->
			<div class="flex flex-col gap-2 w-full">
				<div class="flex items-center justify-between w-full border border-[--primary-color] rounded px-4 py-2 shadow">
					<div class="w-6 h-6 rounded-full bg-white"></div>
					<div class="flex-1 text-center">
						<div class="font-bold">${opponentName.toUpperCase()}</div>
						<div class="text-[--primary-color] text-xs">1258 pts</div>
					</div>
					<div class="text-sm font-bold">R</div>
				</div>
				<div class="flex items-center justify-center gap-2 px-4 py-2 border border-[--primary-color] rounded shadow text-sm font-bold uppercase">
					<span>Controls</span>
					<kbd class="border border-[--secondary-color] px-2 py-0.5 rounded">↑</kbd>
					<kbd class="border border-[--secondary-color] px-2 py-0.5 rounded">↓</kbd>
				</div>
			</div>
		</div>

		<!-- Game Canvas Section -->
		<div class="relative w-full aspect-[21/9] border border-[--primary-color] m-4">
			<canvas id="pong-canvas" class="w-full h-full" data-mode="${mode}"></canvas>
			<div id="countdown-overlay"
				class="absolute top-0 left-0 w-full h-full flex items-center justify-center text-5xl font-bold text-white bg-black bg-opacity-60 hidden">
			</div>
			<button id="start-button"
				class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[--secondary-color] hover:bg-[--secondary-color] text-black font-bold py-2 px-6 rounded shadow">
				Start Match
			</button>
		</div>
	</div>
	`;

	setupGameEvents();
}

function setupGameEvents(): void {
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
	if (canvas) {
		const ctx = canvas.getContext('2d');
		if (ctx) {
			ctx.fillStyle = '#25004d';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
	}
}
