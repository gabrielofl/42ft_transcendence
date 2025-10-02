import * as BABYLON from "@babylonjs/core";
import gameTemplate from "./game.html?raw";
import gameEndedTemplate from "./game-ended.html?raw";
import { createPlayerCard } from "./player-card";
import { ClientGameSocket } from "./ClientGameSocket";
import { ScoreMessage } from "@shared/types/messages";
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

let clientgame: ClientGame;
let clientsocket: ClientGameSocket;

export function replaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
	return template.replace(/\$\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

export async function renderGame(players: PlayerData[]) {
	const main = document.getElementById('main');
	if (!main) return;
	
	// const rendered = replaceTemplatePlaceholders(gameTemplate, { playerName, opponentName, mode });
	main.innerHTML = gameTemplate; 

	setupGameEvents(players);
	//setupGameEndedListener();
	//setupPointMadeListener();
}

function setupGameEvents(playersdata: PlayerData[]): void { 
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
	if (canvas) {
		const container = document.getElementById("player-cards-client");
		if (!container)
			return;

		console.log("Iniciando Pong local");
		container.innerHTML = "";
		if (clientgame)
			clientgame.Dispose();

		if (clientsocket)
			clientsocket.Dispose();

		clientgame = new ClientGame(canvas);
		clientsocket = new ClientGameSocket(clientgame);
		clientgame.CreateGame(createPlayers(clientgame, playersdata, container, clientsocket));
		// setupGameEndedListener(clientgame);
		// setupPointMadeListener(clientgame);
	}
}

function createPlayers(game: ClientGame, playersdata: PlayerData[], container: HTMLElement, socket: ClientGameSocket): APlayer[] {
		// const player = new LocalPlayer("Jorge", "a", "d", ["z", "x", "c"]);
		// const enemy = new LocalPlayer("Sutanito", "h", "k", ["b", "n", "m"]);
		let players: APlayer[] = [];
		playersdata.forEach(p => {
			let player: APlayer | undefined;
			switch (p.type)
			{
				case "Local":
					if (p.leftkey && p.rightkey)
						player = new LocalPlayer(game, p.username, p.rightkey, p.leftkey, p.powerUpKey);
					break;

				case "AI":
					player = new ClientSocketPlayer(game, p.username);
					break;
			}

			if (!player)
				throw new Error("Invalid Player data");
			players.push(player);
		});

 		/* const enemy = new AIPlayer("Fulanito");
		enemy.Color = new BABYLON.Color3(0, 0, 1);
		const enemy2 = new AIPlayer("Menganito");
		enemy2.Color = new BABYLON.Color3(1, 0, 0);
		const enemy3 = new AIPlayer("Sutanito");
		enemy3.Color = new BABYLON.Color3(0, 1, 0);
		const enemy4 = new AIPlayer("Pegonito");
		enemy4.Color = new BABYLON.Color3(1, 0, 1);
*/
		// let players = [enemy, enemy2, enemy3, enemy4];
		// Insertar tarjetas para cada jugador
		players.forEach((player, index) => {
			const color = index % 2 === 0 ? "text-blue-200" : "text-purple-200";
			container.insertAdjacentHTML("beforeend", createPlayerCard(player, color, socket));
		});

	return players;
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
