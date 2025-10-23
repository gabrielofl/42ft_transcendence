import * as BABYLON from "@babylonjs/core";
import gameTemplate from "./game.html?raw";
import gameEndedTemplate from "./game-ended.html?raw";
import tournamentGameEndedTemplate from "./tournament-game-ended.html?raw";
import { createPlayerCard } from "./player-card";
import { ClientGameSocket } from "./ClientGameSocket";
import { AddPlayerMessage, ScoreMessage } from "@shared/types/messages";
import { ClientGame } from "./ClientGame";
import { LocalPlayer } from "./Player/LocalPlayer";
import { ClientSocketPlayer } from "./Player/ClientSocketPlayer";
import { APlayer } from "./Player/APlayer";
import { Maps } from "./Maps";
import { navigateTo } from "../../navigation";
const API_BASE_URL = 'https://localhost:443';

export type PlayerType = "Local" | "AI" | "Remote";

export type PlayerData =
{
	type: PlayerType,
	username: string,
	userid: number,
	leftkey?: string,
	rightkey?: string,
	powerUpKey?: [string, string, string]
}

export function replaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
	return template.replace(/\$\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

export async function renderGame() {
	const main = document.getElementById('main');
	if (!main) return;
	
	// const rendered = replaceTemplatePlaceholders(gameTemplate, { playerName, opponentName, mode });
	main.innerHTML = gameTemplate; 

	// Verificar si es un torneo
	const tournamentMatchInfo = sessionStorage.getItem('tournamentMatchInfo');
	if (tournamentMatchInfo) {
		await setupTournamentGame(JSON.parse(tournamentMatchInfo));
	} else {
		setupGameEvents();
	}
	//setupGameEndedListener();
	//setupPointMadeListener();
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
		
		// Conectar directamente al WebSocket del juego usando el roomId del torneo
		gameSocket.Connect(matchInfo.roomId);

		// Configurar eventos del juego
		setupGameEndedListener(game);
		setupPointMadeListener(game);

	} catch (error) {
		console.error('❌ Error configurando juego de torneo:', error);
		alert('Error iniciando el juego del torneo. Inténtalo de nuevo.');
	}
}

function setupGameEvents(): void { 
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
	if (canvas) {

		const container = document.getElementById("player-cards-client");
		if (!container)
			return;

		container.innerHTML = "";
		// ClientGameSocket.GetInstance().UIBroker.Subscribe("AddPlayer", (msg) => addPlayer(msg));
		// setupGameEndedListener(clientgame);
		// setupPointMadeListener(clientgame);
	}
}

function addPlayer(msg: AddPlayerMessage): void {
	const container = document.getElementById("player-cards-client");
	if (!container)
		return;

	// Añadir la tarjeta del jugador a la UI
	container.insertAdjacentHTML("beforeend", createPlayerCard(msg));
}

// Subscripción al evento GameEnded.
function setupGameEndedListener(game: ClientGame): void {
	game.MessageBroker.Subscribe("GameEnded", (msg: ScoreMessage) => {
		// Verificar si es un match de torneo
		const tournamentMatchInfo = sessionStorage.getItem('tournamentMatchInfo');
		
		if (tournamentMatchInfo) {
			// Es un match de torneo: verificar si es la final
			const matchInfo = JSON.parse(tournamentMatchInfo);
			const isFinal = matchInfo.round === 'Finals';
			
			if (isFinal) {
				// Es la final: navegar inmediatamente sin mostrar panel intermedio
				// La pantalla de trofeo se mostrará desde el waiting room
				console.log('🏆 Final del torneo terminada, navegando directamente al waiting room');
				navigateTo('tournament-waiting');
			} else {
				// No es la final: mostrar panel intermedio breve y luego navegar
				const winner = msg.results.sort((a, b) => b.score - a.score)[0];
				const container = document.querySelector(".relative.w-full") as HTMLDivElement;
				if (!container) return;

				// Mostrar panel específico para torneos
				container.insertAdjacentHTML("beforeend", tournamentGameEndedTemplate);
				const winnerNameSpan = document.getElementById("tournament-winner-name");
				if (winnerNameSpan) winnerNameSpan.textContent = winner.username;

				console.log('🎮 Match de torneo terminado, mostrando panel intermedio');
				
				// Navegar de vuelta al tournament waiting room después de 2 segundos
				setTimeout(() => {
					navigateTo('tournament-waiting');
				}, 2000);
			}
		} else {
			// Es una sala normal: mostrar panel de Game Ended normal
			const winner = msg.results.sort((a, b) => b.score - a.score)[0];
			const container = document.querySelector(".relative.w-full") as HTMLDivElement;
			if (!container) return;

			// Inyectar panel
			container.insertAdjacentHTML("beforeend", gameEndedTemplate);

			// Actualizar nombre del ganador
			const winnerNameSpan = document.getElementById("winner-name");
			if (winnerNameSpan) winnerNameSpan.textContent = winner.username;

			// Configurar botón Play Again
			const playAgainBtn = document.getElementById("play-again-btn");
			if (playAgainBtn) {
				playAgainBtn.addEventListener("click", () => {
					const panel = document.getElementById("game-ended-panel");
					if (panel) panel.remove();
					game.MessageBroker.Publish("GameRestart", { type:"GameRestart" });
					msg.results.forEach(result => 
						setPlayerPoints(result.username, 0)
					);
				});
			}
		}
	});
}

// Subscripción al evento PointMade
function setupPointMadeListener(game: ClientGame) {
	game.MessageBroker.Subscribe("PointMade", (msg: ScoreMessage) => {
		// Buscar el elemento del marcador correspondiente al jugador
		msg.results.forEach(result => 
			setPlayerPoints(result.username, result.score)
		);
	});
}

function setPlayerPoints(username: string, score: number) {
	const scoreEl = document.getElementById(`${username}-score`);
	if (scoreEl) {
		scoreEl.textContent = score.toString();
	}
}
