import { PreMoveMessage, UsePowerUpMessage } from "@shared/types/messages";
import { ClientGame } from "../ClientGame";
import { ClientPaddle } from "../ClientPaddle";
import { APlayer } from "./APlayer";

export class LocalPlayer extends APlayer {

	private leftKey: string;
	private rightKey: string;
	private inventoryKeys: [string, string, string] | undefined;

	constructor(game: ClientGame, id: number, name: string, leftKey: string, rightKey: string, skills?: [string, string, string]) {
		super(game, name);
		this.id = id;
		this.leftKey = leftKey;
		this.rightKey = rightKey;
		this.inventoryKeys = skills;
	}
	
    public getControlKeys(): [string, string] {
        return [this.leftKey, this.rightKey];
    }

	public getInventoryKeys(): [string, string, string] | undefined {
        return this.inventoryKeys;
    }

	public UsePowerUp(index: number)
	{
		console.log("Usa el item: ", index);
		this.Inventory.UsePowerUp(index);
	}

    public ProcessPlayerAction(inputMap: Record<string, boolean>): void {
		if (!inputMap || this.game.Paused)
			return;

		if (inputMap[this.leftKey]) 
		{
			this.game.MessageBroker.Publish("PlayerPreMove", this.GetPreMoveMessage(-1));
		}	
		else if (inputMap[this.rightKey])
		{
			this.game.MessageBroker.Publish("PlayerPreMove", this.GetPreMoveMessage(1));
		}

		if (this.inventoryKeys)
		{
			var i = -1;
			while (++i < 3)
				if (inputMap[this.inventoryKeys[i]])
					this.game.MessageBroker.Publish("PlayerUsePowerUp", this.GetUsePowerUpMessage(i));
		}
	}

	private GetPreMoveMessage(dir: number): PreMoveMessage {
		return {
			type: "PlayerPreMove",
			dir: dir,
			id: this.id,
		};
	}

	private GetUsePowerUpMessage(index: number): UsePowerUpMessage {
		return {
			type: "PlayerUsePowerUp",
			id: this.id,
			slot: index,
		};
	}
}
