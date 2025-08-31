import * as BABYLON from "@babylonjs/core";
import gameTemplate from "./game.html?raw";
import gameEndedTemplate from "./game-ended.html?raw";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { APlayer } from "../Player/APlayer";
import { Game } from "./Game";
import { LocalPlayer } from "../Player/LocalPlayer";
import { AIPlayer } from "../Player/AIPlayer";
import { createPlayerCard } from "./player-card";

let clientgame: Game;
let servergame: Game;

export function replaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
	return template.replace(/\$\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

export async function renderGame(playerName: string, opponentName: string, mode: string = 'local') {
	const main = document.getElementById('main');
	if (!main) return;
	
	main.innerHTML = "";
	const rendered = replaceTemplatePlaceholders(gameTemplate, { playerName, opponentName, mode });
	main.innerHTML = rendered; 

	setupGameEvents();
}

function setupGameEvents(): void { 
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
	if (canvas) {
		const container = document.getElementById("player-cards-client");
		if (!container)
			return;

		container.innerHTML = "";
		clientgame = new Game(canvas, false);
		clientgame.ID = "client";
		clientgame.CreateGame(createPlayers(clientgame, container));
		setupGameEndedListener(clientgame);
		setupPointMadeListener(clientgame);
		console.log("Iniciando Pong local");
	}
	
	const servercanvas = document.getElementById('server-pong-canvas') as HTMLCanvasElement | null;
	if (servercanvas) {
		const servercontainer = document.getElementById("player-cards-server");
		if (!servercontainer)
			return
	
		servercontainer.innerHTML = "";
		servergame = new Game(servercanvas, true);
		servergame.ID = "server";
		servergame.CreateGame(createPlayers(servergame, servercontainer));
		setupGameEndedListener(servergame);
		setupPointMadeListener(servergame);
		console.log("Iniciando Pong Server");
	}
}

function createPlayers(game: Game, container: HTMLElement): APlayer[] {
		// const player = new LocalPlayer("Jorge", "a", "d", ["z", "x", "c"]);
		// const enemy = new LocalPlayer("Sutanito", "h", "k", ["b", "n", "m"]);
		const enemy = new AIPlayer(game, game.ID + "Fulanito");
		enemy.Color = new BABYLON.Color3(0, 0, 1);
		const enemy2 = new AIPlayer(game, game.ID + "Menganito");
		enemy2.Color = new BABYLON.Color3(1, 0, 0);
		const enemy3 = new AIPlayer(game, game.ID + "Sutanito");
		enemy3.Color = new BABYLON.Color3(0, 1, 0);
		const enemy4 = new AIPlayer(game, game.ID + "Pegonito");
		enemy4.Color = new BABYLON.Color3(1, 0, 1);

		let players = [enemy, enemy2, enemy3, enemy4];
		// Insertar tarjetas para cada jugador
		players.forEach((player, index) => {
			const color = index % 2 === 0 ? "text-blue-200" : "text-purple-200";
			container.insertAdjacentHTML("beforeend", createPlayerCard(game, player, color));
		});

		return players;
}

// Subscripción al evento GameEnded.
function setupGameEndedListener(game: Game): void {
	game.MessageBroker.Subscribe(GameEvent.GameEnded, (players: APlayer[]) => {
        const winner = players.sort((a, b) => a.GetScore() - b.GetScore())[0];
		const container = document.querySelector(".relative.w-full") as HTMLDivElement;
		if (!container) 
			return;

		// Inyectar panel
		container.insertAdjacentHTML("beforeend", gameEndedTemplate);

		// Actualizar nombre del ganador
		const winnerNameSpan = document.getElementById("winner-name");
		if (winnerNameSpan) winnerNameSpan.textContent = winner.GetName();

		// Configurar botón
		const playAgainBtn = document.getElementById("play-again-btn");
		if (playAgainBtn) {
			playAgainBtn.addEventListener("click", () => {
				const panel = document.getElementById("game-ended-panel");
				if (panel)
					panel.remove();
				game.MessageBroker.Publish(GameEvent.GameRestart, null);
				players.forEach(p => setPlayerPoints(p, 0));
			});
		}
	});
}

// Subscripción al evento PointMade
function setupPointMadeListener(game: Game) {
	game.MessageBroker.Subscribe(GameEvent.PointMade, (player: APlayer) => {
		// Buscar el elemento del marcador correspondiente al jugador
		setPlayerPoints(player, player.GetScore());
	});
}

function setPlayerPoints(player: APlayer, score: number) {
	const scoreEl = document.getElementById(`${player.GetName()}-score`);
	if (scoreEl) {
		scoreEl.textContent = score.toString();
	}
}
