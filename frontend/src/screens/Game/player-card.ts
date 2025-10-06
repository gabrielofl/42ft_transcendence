import playerCardTemplate from "./player-card.html?raw";
import { replaceTemplatePlaceholders } from "./GameScreen";
import { ClientGameSocket } from "./ClientGameSocket";
import { LocalPlayer } from "./Player/LocalPlayer";
import { APlayer } from "./Player/APlayer";
import { APlayerEffect } from "./Abstract/APlayerEffect";
import { AddPlayerMessage, InventoryChangeMessage, ScoreMessage } from "@shared/types/messages";
import { MSFT_sRGBFactors } from "@babylonjs/loaders/glTF/2.0";

export function createPlayerCard(msg: AddPlayerMessage): string {
    ClientGameSocket.GetInstance().UIBroker.Subscribe("InventoryChanged", (msg) => updateInventorySlot(msg));
    ClientGameSocket.GetInstance().UIBroker.Subscribe("PointMade", (msg) => updateScore(msg));
    // game.MessageBroker.Subscribe(GameEvent.AppliedEffect, (args: AppliedEffectArgs) => {
    //     if (player === args.Target)
    //         addEffect(args.Target.GetName(), args.Effect);
    // });

    let name = msg.playerData.name;
    return replaceTemplatePlaceholders(playerCardTemplate, { name });
}

function addEffect(playerName: string, effect: APlayerEffect): void {
	const effectsContainer = document.getElementById(`${playerName}-effects`);
    console.log("Añadiendo efecto a: " + playerName);
	if (effectsContainer) {
		// si existe el placeholder invisible, lo quitamos
		if (effectsContainer.children.length === 1 && 
		    (effectsContainer.children[0] as HTMLElement).style.visibility === "hidden") {
			effectsContainer.children[0].remove();
		}

		const effectIcon = document.createElement("div");
		effectIcon.className = "w-5 h-5 bg-gray-800 border border-gray-600 rounded-md";
		effectIcon.style.backgroundImage = `url(${effect.ImgPath})`; // opcional, si tienes imágenes
		effectIcon.style.backgroundSize = "cover";
		effectsContainer.appendChild(effectIcon);
		// effect.OnDisposeEvent.Subscribe(() => removeEffect(effectsContainer, effectIcon));
		effect.OnDisposeEvent.Subscribe(() => removeEffect(effectsContainer, effectIcon));
	}
}

function removeEffect(effectsContainer: HTMLElement, effectIcon: HTMLDivElement) {
	effectIcon.remove();
	if (effectsContainer.children.length === 0)
	{
		const invisibleIcon = document.createElement("div");
		invisibleIcon.className = "w-5 h-5"; // mantiene el alto reservado
		invisibleIcon.style.visibility = "hidden"; // no se ve, pero ocupa espacio
		effectsContainer.appendChild(invisibleIcon)
	}
}

/**
 * Actualiza un slot del inventario en la UI, mostrando o limpiando la imagen del power-up.
 * @param msg El mensaje con los datos del cambio de inventario.
 */
function updateInventorySlot(msg: InventoryChangeMessage) {
    const slotElement = document.querySelector<HTMLDivElement>(
        `#${msg.username}-inventory > div[id="${msg.slot}"]`
    );

    if (slotElement) {
        if (msg.path) {
            // Si hay una ruta, muestra la imagen.
            slotElement.style.backgroundImage = `url(${msg.path})`;
            slotElement.style.backgroundSize = "cover";
            slotElement.style.backgroundPosition = "center";
        } else {
            // Si la ruta está vacía, limpia el slot.
            slotElement.style.backgroundImage = "";
        }
    }
}

/**
 * Actualiza el marcador de puntuación en las tarjetas de los jugadores.
 * @param {ScoreMessage} msg El mensaje del servidor que contiene los resultados de la puntuación.
 */
function updateScore(msg: ScoreMessage): void {
    msg.results.forEach(playerResult => {
        const scoreElement = document.getElementById(`${playerResult.username}-score`);
        if (scoreElement) {
            scoreElement.textContent = playerResult.score.toString();
        }
    });
}
