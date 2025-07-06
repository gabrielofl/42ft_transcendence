import playerCardTemplate from "./player-card.html?raw";
import { APlayer } from "../Player/APlayer";
import { LocalPlayer } from "../Player/LocalPlayer";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { replaceTemplatePlaceholders } from "./GameScreen";
import { PwrUpEventArgs } from "../Inventory";
import { Game } from "./Game";
import { APlayerEffect, AppliedEffectArgs, PlayerEffectFactory } from "../PowerUps/Effects/APlayerEffect";

export function createPlayerCard(player: APlayer, colorClass: string): string {
    let keysHTML = "";

    if (player instanceof LocalPlayer) {
        const [leftKey, rightKey] = player.getControlKeys();
        keysHTML += renderKey(leftKey);
        keysHTML += renderKey(rightKey);
    }

    let controls = player instanceof LocalPlayer ? `
        <div class="font-semibold ${colorClass} text-xs">Controls:</div>
        <div class="flex gap-2">${keysHTML}</div>   
    ` : "";

	setupEffectsListener(player);

    let name = player.GetName();
    return replaceTemplatePlaceholders(playerCardTemplate, { name, controls });
}

function renderKey(key: string): string {
    return `<kbd class="px-2 py-0.5 bg-gray-800 rounded border border-gray-500">${key.toUpperCase()}</kbd>`;
}

function setupEffectsListener(player: APlayer) {
	MessageBroker.Subscribe<AppliedEffectArgs>(GameEvent.AppliedEffect, (args: AppliedEffectArgs) => {
        if (player === args.Target)
            addEffect(args.Target.GetName(), args.Effect);
    });
    MessageBroker.Subscribe<PwrUpEventArgs>(GameEvent.InventoryChange, (args: PwrUpEventArgs) => updateInventory(player, args));
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

function updateInventory(player: APlayer, args: PwrUpEventArgs) {
    // Solo actualizamos si el evento es de ESTE jugador
    if (args.Player !== player)
        return;

    const slotElement = document.querySelector<HTMLDivElement>(
        `#${player.GetName()}-inventory > div[id="${args.Slot}"]`
    );

    if (slotElement) {
        if (args.Action == "Pick")
        {
            slotElement.style.backgroundImage = `url(${args.PowerUp?.ImgPath})`;
            slotElement.style.backgroundSize = "cover";
            slotElement.style.backgroundPosition = "center";
        }
        else
        {
            slotElement.style.backgroundImage = "";
        }
    }
}
