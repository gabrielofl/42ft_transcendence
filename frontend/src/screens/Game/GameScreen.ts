import gameTemplate from "./game.html?raw";
import { ClientGameSocket } from "./ClientGameSocket";
import { ReactiveViewModel } from "../../mvvm/ReactiveViewModel";
import { DOMBinder } from "../../mvvm/DOMBinder";
import { onScreenLeave, navigateTo } from "../../navigation";
import { ClientGame } from "./ClientGame";
import { Maps } from "./Maps";
import tournamentGameEndedTemplate from "./tournament-game-ended.html?raw";
import { ScoreMessage } from "@shared/types/messages";

var unsubscribeFromGameLeave: () => void;

interface GameViewModel {
  [username: string]: Partial<{
    score: number;
    inventory: Record<number, { path: string }>;
    effects: string[];
  }>;
}

export const GameViewModel = new ReactiveViewModel<GameViewModel>();
const binder = new DOMBinder(GameViewModel);

export function replaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
	return template.replace(/\$\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

export async function renderGame() {
	const main = document.getElementById('main');
	if (!main) return;
	
	main.innerHTML = gameTemplate;

	// Verificar si es un torneo
	const tournamentMatchInfo = sessionStorage.getItem('tournamentMatchInfo');
	if (tournamentMatchInfo) {
		await setupTournamentGame(JSON.parse(tournamentMatchInfo));
	} else {
		setupNormalGameEvents();
	}
}

async function setupTournamentGame(matchInfo: any): Promise<void> {
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
	if (!canvas) {
		console.error('❌ Canvas no encontrado');
		return;
	}

	try {
		// Crear el juego con el mapa del torneo
		const game = new ClientGame(canvas, Maps[matchInfo.mapKey || 'ObstacleMap']);
		
		// Configurar jugadores EN EL MISMO ORDEN que el backend (player1, player2 del bracket)
		// Esto es crítico para que las paletas se asignen correctamente
		const players: [number, string][] = [
			[matchInfo.player1.userId, matchInfo.player1.username],
			[matchInfo.player2.userId, matchInfo.player2.username]
		];

		await game.AddPlayers({ type: 'AllReady', nArray: players });

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

	} catch (error) {
		console.error('❌ Error configurando juego de torneo:', error);
		alert('Error iniciando el juego del torneo. Inténtalo de nuevo.');
	}
}

function setupNormalGameEvents(): void {
	const container = document.getElementById("player-cards-client");
	if (!container)
		return;

	console.log("Registrando bindings");
	binder.RegisterBindings(container.parentElement as HTMLElement);

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

	if (!unsubscribeFromGameLeave) {
		unsubscribeFromGameLeave = onScreenLeave("game", () => {
			console.log("Vaciando GameViewModel, cerrando Socket y liberando ClientGame");
			GameViewModel.data = {};
			ClientGameSocket.GetInstance()?.DisposeGame();
		});
	}
}

function setupTournamentListeners(game: ClientGame): void {
	const container = document.getElementById("player-cards-client");
	if (container) {
		console.log("Registrando bindings para torneo");
		binder.RegisterBindings(container.parentElement as HTMLElement);
	}

	// Listener para GameEnded (torneos)
	game.MessageBroker.Subscribe("GameEnded", (msg: ScoreMessage) => {
		const tournamentMatchInfo = sessionStorage.getItem('tournamentMatchInfo');
		
		if (tournamentMatchInfo) {
			const matchInfo = JSON.parse(tournamentMatchInfo);
			const isFinal = matchInfo.round === 'Finals';
			
			if (isFinal) {
				console.log('🏆 Final del torneo terminada, navegando directamente al waiting room');
				navigateTo('tournament-waiting');
			} else {
				const winner = msg.results.sort((a, b) => b.score - a.score)[0];
				const container = document.querySelector(".relative.w-full") as HTMLDivElement;
				if (!container) return;

				container.insertAdjacentHTML("beforeend", tournamentGameEndedTemplate);
				const winnerNameSpan = document.getElementById("tournament-winner-name");
				if (winnerNameSpan) winnerNameSpan.textContent = winner.username;

				console.log('🎮 Match de torneo terminado, mostrando panel intermedio');
				
				setTimeout(() => {
					navigateTo('tournament-waiting');
				}, 2000);
			}
		}
	});
}