import * as BABYLON from "@babylonjs/core";
import gameTemplate from "./game.html?raw";
import gameEndedTemplate from "./game-ended.html?raw";
import { createPlayerCard } from "./player-card";
import { ClientGameSocket } from "./ClientGameSocket";
import { AddPlayerMessage, ScoreMessage } from "@shared/types/messages";
import { ClientGame } from "./ClientGame";
import { LocalPlayer } from "./Player/LocalPlayer";
import { ClientSocketPlayer } from "./Player/ClientSocketPlayer";
import { APlayer } from "./Player/APlayer";
import { Maps } from "./Maps";
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
		
		// Configurar jugadores
		const players: [number, string][] = [
			[matchInfo.userId, matchInfo.username], // Jugador local
			[matchInfo.opponent.userId, matchInfo.opponent.username] // Oponente
		];

		await game.AddPlayers({ type: 'AllReady', nArray: players });

		// Conectar al WebSocket del juego directamente (sin usar ClientGameSocket.StartGame)
		const gameSocket = ClientGameSocket.GetInstance();
		// Conectar directamente al WebSocket del juego
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
        const winner = msg.results.sort((a, b) => a.score - b.score)[0];
		const container = document.querySelector(".relative.w-full") as HTMLDivElement;
		if (!container) 
			return;

		// Inyectar panel
		container.insertAdjacentHTML("beforeend", gameEndedTemplate);

		// Actualizar nombre del ganador
		const winnerNameSpan = document.getElementById("winner-name");
		if (winnerNameSpan) winnerNameSpan.textContent = winner.username;

		// Configurar botón
		const playAgainBtn = document.getElementById("play-again-btn");
		if (playAgainBtn) {
			playAgainBtn.addEventListener("click", () => {
				const panel = document.getElementById("game-ended-panel");
				if (panel)
					panel.remove();
				game.MessageBroker.Publish("GameRestart", { type:"GameRestart" });
				msg.results.forEach(result => 
					setPlayerPoints(result.username, 0)
				);
			});
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
