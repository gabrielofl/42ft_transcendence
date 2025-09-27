import * as BABYLON from "@babylonjs/core";
import { MapDefinition, Maps } from "./Maps"; // el objeto que contiene todos los mapas
import { APongTable } from "../../../../shared/abstract/APongTable";
import view from "./map-selection.html?raw";
import { ClientGame } from "./ClientGame";

let game: ClientGame;
let pong: APongTable;

export async function renderMapSelection() {
	const main = document.getElementById("main");
	if (!main)
        return;

	main.innerHTML = view;

	// Lista de mapas
	const mapList = document.getElementById("map-list")!;
	let selectedMapKey: string | null = null;

	Object.entries(Maps).forEach(([key, def]) => {
		const li = document.createElement("li");
		li.textContent = key;
		li.style.cursor = "pointer";
		li.style.padding = "5px";

		li.addEventListener("click", () => {
			// Marcar selección
			Array.from(mapList.children).forEach(el => (el as HTMLElement).style.background = "");
			li.style.background = "#ddd";
			selectedMapKey = key;

			// Renderizar mapa en canvas
			renderPreview(def);
			(document.getElementById("select-map") as HTMLButtonElement).disabled = false;
		});

		mapList.appendChild(li);
	});

	// Botón de confirmar
	document.getElementById("select-map")!.addEventListener("click", () => {
		if (!selectedMapKey) return;
		const chosen = Maps[selectedMapKey];
		console.log("Mapa elegido:", selectedMapKey, chosen);

		// Aquí podrías arrancar el juego ya con ese mapa
		// p.ej: renderGame("Jugador1", "Jugador2", "local", chosen);
	});
}

function renderPreview(mapDef: MapDefinition) {
	const canvas = document.getElementById("map-canvas") as HTMLCanvasElement;

/*     if (pong)
        pong.Dispose(); */

/* 	APongTable.Map = mapDef;

	if (!game)
		game = new ClientGame(canvas);
	pong = new APongTable(game); */
}
