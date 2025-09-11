import * as BABYLON from "@babylonjs/core";
import gameTemplate from "./game.html?raw";
import gameEndedTemplate from "./game-ended.html?raw";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { APlayer } from "../Player/APlayer";
import { Game } from "./Game";
import { LocalPlayer } from "../Player/LocalPlayer";
import { AIPlayer } from "../Player/AIPlayer";
import { createPlayerCard } from "./player-card";

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

export async function renderGame(players: PlayerData[]) {
	const main = document.getElementById('main');
	if (!main) return;
	
	main.innerHTML = "";

	// const rendered = replaceTemplatePlaceholders(gameTemplate, { playerName, opponentName, mode });
	main.innerHTML = gameTemplate; 

	setupGameEvents(players);
	setupGameEndedListener();
	setupPointMadeListener();
}

function setupGameEvents(playersdata: PlayerData[]): void { 
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement | null;
	if (canvas) {
		console.log("Iniciando Pong 3D", canvas);
		// Game instance is needed to make players.
		Game.CreateInstance(canvas);

		const container = document.getElementById("player-cards");
		if (!container) return;

		// Limpiar cualquier tarjeta previa
		container.innerHTML = "";

		// const player = new LocalPlayer("Jorge", "a", "d", ["z", "x", "c"]);
		// const enemy = new LocalPlayer("Sutanito", "h", "k", ["b", "n", "m"]);
		let players: APlayer[] = [];
		playersdata.forEach(p => {
			let player: APlayer | undefined;
			switch (p.type)
			{
				case "Local":
					if (p.leftkey && p.rightkey)
						player = new LocalPlayer(p.username, p.userid, p.rightkey, p.leftkey, p.powerUpKey);
					break;

				case "AI":
					player = new AIPlayer(p.username, p.userid);
					break;
			}

			if (!player)
				throw new Error("Invalid Player data");
			players.push(player);
		});

/* 		const enemy = new AIPlayer("Fulanito");
		enemy.Color = new BABYLON.Color3(0, 0, 1);
		const enemy2 = new AIPlayer("Menganito");
		enemy2.Color = new BABYLON.Color3(1, 0, 0);
		const enemy3 = new AIPlayer("Sutanito");
		enemy3.Color = new BABYLON.Color3(0, 1, 0);
		const enemy4 = new AIPlayer("Pegonito");
		enemy4.Color = new BABYLON.Color3(1, 0, 1); */

		// let players = [enemy, enemy2, enemy3, enemy4];
		// Insertar tarjetas para cada jugador
		players.forEach((player, index) => {
			const color = index % 2 === 0 ? "text-blue-200" : "text-purple-200";
			container.insertAdjacentHTML("beforeend", createPlayerCard(player, color));
		});

		Game.GetInstance().CreateGame(players);
	}
}

// Subscripción al evento GameEnded.
function setupGameEndedListener(): void {
	MessageBroker.Subscribe(GameEvent.GameEnded, (players: APlayer[]) => {
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
				MessageBroker.Publish(GameEvent.GameRestart, null);
				players.forEach(p => setPlayerPoints(p, 0));
			});
		}
	});
}

// Subscripción al evento PointMade
function setupPointMadeListener() {
	MessageBroker.Subscribe(GameEvent.PointMade, (player: APlayer) => {
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
