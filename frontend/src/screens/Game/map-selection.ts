import * as BABYLON from "@babylonjs/core";
import { MapDefinition, Maps } from "./Maps"; // el objeto que contiene todos los mapas
import view from "./map-selection.html?raw";
import { ClientGame } from "./ClientGame";
import { PowerUpType } from '@shared/types/messages';
import { navigateTo } from "../../navigation";

let game: ClientGame;
const ALL_POWERUPS: PowerUpType[] = ["MoreLength", "LessLength", "CreateBall", "Shield", "SpeedDown", "SpeedUp"];
export let SelectedMap: MapDefinition = Maps.MultiplayerMap;

export function renderMapSelection(): void {
    const main = document.getElementById('main');
    if (!main) return;

    main.innerHTML = view;
	
    setupMapSelectionControls();
}

function setupMapSelectionControls(): void {
    const powerupAmountSlider = document.getElementById('powerup-amount') as HTMLInputElement;
    const powerupAmountValue = document.getElementById('powerup-amount-value');
    const powerupTypesContainer = document.getElementById('powerup-types');
    const saveConfigBtn = document.getElementById('save-config-btn');
    const createGameBtn = document.getElementById('create-game-btn');
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

    // --- Lógica del Slider ---
    if (powerupAmountSlider && powerupAmountValue) {
        powerupAmountSlider.addEventListener('input', () => {
            powerupAmountValue.textContent = powerupAmountSlider.value;
        });
    }

    // --- Lógica de los Checkboxes ---
    if (powerupTypesContainer) {
        powerupTypesContainer.innerHTML = ALL_POWERUPS.map(type => `
            <label class="flex items-center space-x-2 cursor-pointer text-white">
                <input type="checkbox" name="powerup-type" value="${type}" class="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-500 rounded" checked>
                <span>${type}</span>
            </label>
        `).join('');
    }

    // --- Lógica del botón de Guardar ---
    saveConfigBtn?.addEventListener('click', () => {
        const enabledPowerups = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="powerup-type"]:checked'))
                                     .map(checkbox => checkbox.value as PowerUpType);

        const config = {
            powerUpAmount: parseInt(powerupAmountSlider.value, 10),
            enabledPowerUpTypes: enabledPowerups,
            // Aquí podrías añadir también el mapa seleccionado
            // selectedMap: ... 
        };

        // Guardar la configuración en localStorage como un string JSON
        localStorage.setItem('pongGameConfig', JSON.stringify(config));

        // Notificar al usuario (opcional)
        alert('¡Configuración guardada!');
        console.log('Configuración guardada:', config);
    });

    // Lógica para el botón de crear partida (ejemplo)
    createGameBtn?.addEventListener('click', () => {
        console.log("CreateGameBtn Clicked");
        navigateTo('waiting');
    });
}

function renderPreview(mapDef: MapDefinition) {
	const canvas = document.getElementById("map-canvas") as HTMLCanvasElement;

	SelectedMap = mapDef;

	if (game)
		game.Dispose();

	game = new ClientGame(canvas, SelectedMap, true);
}
