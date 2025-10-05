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

	setupGameEvents();
	//setupGameEndedListener();
	//setupPointMadeListener();
}

function setupGameEvents(): void { 
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
	if (canvas) {
		console.log("Iniciando Pong local");
		const startGameBtn = document.getElementById('start-game-btn');
		const startGameOverlay = document.getElementById('start-game-overlay');

		if (startGameBtn && startGameOverlay) {
			startGameBtn.addEventListener('click', () => {
				ClientGameSocket.Canvas = canvas;
				ClientGameSocket.GetInstance().CreateGame();
				startGameOverlay.style.display = 'none'; // Ocultar el overlay
			}, { once: true }); // El listener se ejecuta solo una vez
		}

		const container = document.getElementById("player-cards-client");
		if (!container)
			return;

		container.innerHTML = "";
		ClientGameSocket.GetInstance().UIBroker.Subscribe("AddPlayer", (msg) => addPlayer(msg));
		// setupGameEndedListener(clientgame);
		// setupPointMadeListener(clientgame);
	}
}

function addPlayer(msg: AddPlayerMessage): void {
	const container = document.getElementById("player-cards-client");
	if (!container)
		return;

	let clientgame: ClientGame | undefined= ClientGameSocket.GetInstance().GetGame();
	if (!clientgame)
		return;
	
	const isLocal = msg.playerData.name === "Gabriel"; // Asumiendo que "Gabriel" es el jugador local
	let player: APlayer;
	if (isLocal) {
		player = new LocalPlayer(clientgame, msg.playerData.name, "d", "a");
	} else {
		player = new ClientSocketPlayer(clientgame, msg.playerData.name);
	}
	clientgame.AddPlayer(player);

	// Asignar color desde el mensaje del backend
	player.Color = BABYLON.Color3.FromHexString(msg.playerData.color);
	// Configurar la pala del jugador con la posición y rotación del backend
	player.ConfigurePaddleBehavior(
		{ 
			position: new BABYLON.Vector3(msg.position.x, msg.position.y, msg.position.z),
			lookAt: new BABYLON.Vector3(msg.lookAt.x, msg.lookAt.y, msg.lookAt.z)
		});

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
