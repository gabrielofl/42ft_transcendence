import gameTemplate from "./game.html?raw";
import { ClientGameSocket } from "./ClientGameSocket";
import { ReactiveViewModel } from "../../mvvm/ReactiveViewModel";
import { DOMBinder } from "../../mvvm/DOMBinder";
import { onScreenLeave, navigateTo } from "../../navigation";
import { ClientGame } from "./ClientGame";
import { Maps } from "./Maps";
import tournamentGameEndedTemplate from "./tournament-game-ended.html?raw";
import { CountdownMessage, MatchSuddenDeathMessage, MatchTimerTickMessage, ScoreMessage } from "@shared/types/messages";
import { clearTournamentMatchInfo, getStoredTournamentMatchInfo, validateStoredTournamentMatch } from "../../services/tournament-state";
import {  setupAlert } from "../AlertModal.js";

var unsubscribeFromGameLeave: () => void;

interface GameViewModel {
  [username: string]: Partial<{
    score: number;
    inventory: Record<number, { path: string }>;
    effects: string[];
    controls: {
      moveUp: string;
      moveDown: string;
      powerUpKeys: string[];
    };
  }>;
}

function syncControlsFromGame(game: ClientGame) {
	const bindings = game.ControlBindings || {};
	const vmUpdate: GameViewModel = {};

	for (const [username, b] of Object.entries(bindings)) {
		vmUpdate[username] = {
			controls: {
				moveUp: b.moveRight,
				moveDown: b.moveLeft,
				powerUpKeys: b.powerUpKeys,
			},
		};
	}

	GameViewModel.UpdateFromObject(vmUpdate);
}

export const GameViewModel = new ReactiveViewModel<GameViewModel>();
const binder = new DOMBinder(GameViewModel);

function showCountdown(seconds: number, message: string) {
	const countdownContainer = document.getElementById('countdown-container');
	const timerElement = document.getElementById('countdown-timer');
	const timerMessage = document.getElementById('countdown-message');
	
	if (!countdownContainer || !timerElement || !timerMessage)
		return;

	timerMessage.textContent = message;
	timerElement.textContent = String(seconds);
	if (seconds > 1) {
		countdownContainer.classList.remove('hidden');
	} else {
		setTimeout(() => {
			countdownContainer?.classList.add('hidden');
		}, 500);
	}
}

let tournamentHudContainer: HTMLElement | null = null;
let tournamentTimerDisplay: HTMLElement | null = null;
let tournamentSuddenDeathBanner: HTMLElement | null = null;

function formatTournamentTimer(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(total / 60);
	const remainingSeconds = total % 60;
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

const handleTournamentTimerTick = (msg: MatchTimerTickMessage) => {
	if (!tournamentTimerDisplay) {
		return;
	}

	tournamentTimerDisplay.textContent = formatTournamentTimer(msg.remainingSeconds);

	if (tournamentSuddenDeathBanner) {
		if (msg.suddenDeath) {
			tournamentSuddenDeathBanner.classList.remove("hidden");
		} else {
			tournamentSuddenDeathBanner.classList.add("hidden");
		}
	}
};

const handleTournamentSuddenDeath = (_msg: MatchSuddenDeathMessage) => {
	if (tournamentSuddenDeathBanner) {
		tournamentSuddenDeathBanner.classList.remove("hidden");
	}

	if (tournamentTimerDisplay) {
		tournamentTimerDisplay.textContent = "00:00";
	}
};

function prepareTournamentHUD(): void {
	tournamentHudContainer = document.getElementById("tournament-hud");
	if (!tournamentHudContainer) {
		return;
	}

	tournamentHudContainer.classList.remove("hidden");
	tournamentHudContainer.innerHTML = `
		<div id="tournament-controls" class="flex gap-4 text-[10px] text-gray-300 mb-1"></div>
		<div class="text-xs uppercase tracking-wide text-gray-300">Time Remaining</div>
		<div id="tournament-timer-display" class="text-3xl font-extrabold text-white">--:--</div>
		<div id="tournament-sudden-death" class="hidden text-sm font-bold text-red-400 uppercase tracking-wide">Sudden Death</div>
	`;

	tournamentTimerDisplay = document.getElementById("tournament-timer-display");
	tournamentSuddenDeathBanner = document.getElementById("tournament-sudden-death");
	if (tournamentTimerDisplay) {
		tournamentTimerDisplay.textContent = "--:--";
	}
	if (tournamentSuddenDeathBanner) {
		tournamentSuddenDeathBanner.classList.add("hidden");
	}
}

function renderLocalControlsOverCanvas(game: ClientGame) {
	const left = document.getElementById("controls-local-1");
	const right = document.getElementById("controls-local-2");
	if (!left || !right) return;

	left.innerHTML = "";
	right.innerHTML = "";

	const bindings = game.ControlBindings || {};
	const entries = Object.entries(bindings);
	if (!entries.length) return;

	const makeBlock = (username: string, b: { moveLeft: string; moveRight: string; powerUpKeys: string[] }) => {
		const move = `${b.moveLeft.toUpperCase()} / ${b.moveRight.toUpperCase()}`;
		const powers = b.powerUpKeys.map((k) => k.toUpperCase()).join(" / ");

		return `
			<div class="bg-black/60 text-[10px] text-gray-100 rounded-md px-2 py-1 shadow">
				<div class="font-semibold text-[11px] mb-0.5">${username}</div>
				<div>Move: <span class="font-mono">${move}</span></div>
				<div>PowerUps: <span class="font-mono">${powers}</span></div>
			</div>
		`;
	};

	const [first, second] = entries;

	if (first) {
		const [username, binding] = first;
		left.innerHTML = makeBlock(username, binding);
	}

	if (second) {
		const [username, binding] = second;
		right.innerHTML = makeBlock(username, binding);
	}
}

function hideTournamentHUD(): void {
	tournamentHudContainer = document.getElementById("tournament-hud");
	if (!tournamentHudContainer) {
		return;
	}

	tournamentHudContainer.classList.add("hidden");
	tournamentHudContainer.innerHTML = "";
	tournamentTimerDisplay = null;
	tournamentSuddenDeathBanner = null;
}

function attachTournamentEventHandlers(): void {
	const socket = ClientGameSocket.GetInstance();
	socket.UIBroker.Unsubscribe("MatchTimerTick", handleTournamentTimerTick);
	socket.UIBroker.Unsubscribe("MatchSuddenDeath", handleTournamentSuddenDeath);
	socket.UIBroker.Subscribe("MatchTimerTick", handleTournamentTimerTick);
	socket.UIBroker.Subscribe("MatchSuddenDeath", handleTournamentSuddenDeath);
}

function detachTournamentEventHandlers(): void {
	const socket = ClientGameSocket.GetInstance();
	socket.UIBroker.Unsubscribe("MatchTimerTick", handleTournamentTimerTick);
	socket.UIBroker.Unsubscribe("MatchSuddenDeath", handleTournamentSuddenDeath);
}

export function replaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
	return template.replace(/\$\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

function focusGameCanvas() {
  const canvas = document.getElementById("pong-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  if (!canvas.hasAttribute("tabindex")) {
    canvas.setAttribute("tabindex", "0");
  }

  requestAnimationFrame(() => {
    try {
      canvas.focus();
    } catch (e) {
      console.warn("Could not focus canvas:", e);
    }
  });
}

export async function renderGame() {
	const main = document.getElementById('main');
	if (!main) return;
	
	main.innerHTML = gameTemplate;
	focusGameCanvas();

	// Verificar si es un torneo
	const { status, matchInfo } = await validateStoredTournamentMatch();

	if ((status === "active" || status === "unknown") && matchInfo) {
		if (status === "unknown") {
			console.warn("No se pudo verificar el estado del torneo. Continuando con la información local.");
		}
		await setupTournamentGame(matchInfo);
		console.log("MATCH INFO: ", matchInfo);
		return;
	}

	if (status === "inactive") {
		clearTournamentMatchInfo();
	}

	setupNormalGameEvents();
	try {
		const game = await ClientGameSocket.GetInstance().StartGame();
		syncControlsFromGame(game);
		renderLocalControlsOverCanvas(game);
		focusGameCanvas();
	} catch (error) {
		console.error("❌ Error iniciando juego normal:", error);
		setupAlert('Oops!', "No se pudo iniciar la partida. Inténtalo de nuevo.", "Close");
	}
}

async function setupTournamentGame(matchInfo: any): Promise<void> {
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
	if (!canvas) {
		console.error('❌ Canvas no encontrado');
		return;
	}

	prepareTournamentHUD();
	attachTournamentEventHandlers();

	const container = document.getElementById("player-cards-client");
  	if (!container) return;
	binder.RegisterBindings(container.parentElement as HTMLElement);
	
	try {
		// Crear el juego con el mapa del torneo
		const game = new ClientGame(canvas, Maps[matchInfo.mapKey || 'BaseMap']);
		
		// Configurar jugadores EN EL MISMO ORDEN que el backend (player1, player2 del bracket)
		// Esto es crítico para que las paletas se asignen correctamente
		const players: [number, string][] = [
			[matchInfo.player1.userId, matchInfo.player1.username],
			[matchInfo.player2.userId, matchInfo.player2.username]
		];

		await game.AddPlayers({ type: 'AllReady', nArray: players });
		syncControlsFromGame(game);
		renderLocalControlsOverCanvas(game);

		// Configurar WebSocket y eventos ANTES de conectar
		const gameSocket = ClientGameSocket.GetInstance();

		// Guardar referencia del juego en el socket
		gameSocket.game = game;
		
		// Suscribir movimientos del jugador para enviarlos al servidor
		game.MessageBroker.Subscribe("PlayerPreMove", (msg) => gameSocket.Send(msg));
		game.MessageBroker.Subscribe("PlayerUsePowerUp", (msg) => gameSocket.Send(msg));
		
		// Conectar directamente al WebSocket del juego usando el roomId del torneo
		gameSocket.Connect(matchInfo.roomId, () => {
			gameSocket.Send({ type: "GameInit" });
		});

		// Configurar eventos del juego
		setupTournamentListeners(game);

		GameViewModel.UpdateFromObject({
			[matchInfo.player1.username]: { score: 0, inventory: {}, effects: [] },
			[matchInfo.player2.username]: { score: 0, inventory: {}, effects: [] },
		});
		focusGameCanvas();
	} catch (error) {
		console.error('❌ Error configurando juego de torneo:', error);
		alert('Error iniciando el juego del torneo. Inténtalo de nuevo.');
	}
}

function setupNormalGameEvents(): void {
	hideTournamentHUD();
	detachTournamentEventHandlers();

	const container = document.getElementById("player-cards-client");
	if (container) {
		binder.RegisterBindings(container.parentElement as HTMLElement);
	}

	ClientGameSocket.GetInstance().UIBroker.Subscribe("PointMade", (msg) => {
		const obj = msg.results.reduce((acc, m) => {
			acc[m.username] = { score: m.score };
			return acc;
		}, {} as Record<string, { score: number }>);

		GameViewModel.UpdateFromObject(obj);
	});

	ClientGameSocket.GetInstance().UIBroker.Subscribe("InventoryChanged", (msg) => {
		GameViewModel.UpdateFromObject( {
			[msg.username]: {
				["inventory"]: {
					[msg.slot]: {
						["path"]: msg.path 
					}
				}
			}
		});
	});

	ClientGameSocket.GetInstance().UIBroker.Subscribe("EffectsChanged", (msg) => {
		GameViewModel.UpdateFromObject(msg.data);
	});

	ClientGameSocket.GetInstance().UIBroker.Subscribe("GameCountdown", (msg: CountdownMessage) => {
		showCountdown(msg.seconds, msg.message);
	});

	if (!unsubscribeFromGameLeave) {
		unsubscribeFromGameLeave = onScreenLeave("game", () => {
			console.log("Vaciando GameViewModel, cerrando Socket y liberando ClientGame");
			GameViewModel.data = {};
			ClientGameSocket.GetInstance()?.DisposeGame();
		});
	}
}

function setupTournamentListeners(game: ClientGame): void {
		

	ClientGameSocket.GetInstance().UIBroker.Subscribe("PointMade", (msg) => {
		const obj = msg.results.reduce((acc, m) => {
			acc[m.username] = { score: m.score };
			return acc;
		}, {} as Record<string, { score: number }>);

		GameViewModel.UpdateFromObject(obj);
	});

	ClientGameSocket.GetInstance().UIBroker.Subscribe("InventoryChanged", (msg) => {
		GameViewModel.UpdateFromObject( {
			[msg.username]: {
				["inventory"]: {
					[msg.slot]: {
						["path"]: msg.path 
					}
				}
			}
		});
	});

	ClientGameSocket.GetInstance().UIBroker.Subscribe("EffectsChanged", (msg) => {
		GameViewModel.UpdateFromObject(msg.data);
	});

	ClientGameSocket.GetInstance().UIBroker.Subscribe("GameCountdown", (msg: CountdownMessage) => {
		showCountdown(msg.seconds, msg.message);
	});

	if (!unsubscribeFromGameLeave) {
		unsubscribeFromGameLeave = onScreenLeave("game", () => {
			console.log("Vaciando GameViewModel, cerrando Socket y liberando ClientGame");
			GameViewModel.data = {};
			ClientGameSocket.GetInstance()?.DisposeGame();
		});
	}
	// Listener para GameEnded (torneos)
	game.MessageBroker.Subscribe("GameEnded", (msg: ScoreMessage) => {
		// const matchInfo = getStoredTournamentMatchInfo();

		// if (matchInfo) {
		// 	const isFinal = matchInfo.round === 'Finals';
			
		// 	if (isFinal) {
		// 		console.log('🏆 Final del torneo terminada, navegando directamente al waiting room');
		// 		navigateTo('tournament-waiting');
		// 	} else {
		// 		const winner = msg.results.sort((a, b) => b.score - a.score)[0];
		// 		const container = document.querySelector(".relative.w-full") as HTMLDivElement;
		// 		if (!container) return;

		// 		container.insertAdjacentHTML("beforeend", tournamentGameEndedTemplate);
		// 		const winnerNameSpan = document.getElementById("tournament-winner-name");
		// 		if (winnerNameSpan) winnerNameSpan.textContent = winner.username;

		// 		console.log('🎮 Match de torneo terminado, mostrando panel intermedio');
				
		// 		setTimeout(() => {
		// 			navigateTo('tournament-waiting');
		// 		}, 2000);
		// 	}
		// }
	});
}