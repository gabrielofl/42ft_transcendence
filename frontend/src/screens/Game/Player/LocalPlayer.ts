import { ClientGame } from "../ClientGame";
import { ClientPaddle } from "../ClientPaddle";
import { APlayer } from "./APlayer";

export class LocalPlayer extends APlayer {

	private leftKey: string;
	private rightKey: string;
	private inventoryKeys: [string, string, string] | undefined;
	private id: number;

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
			this.game.MessageBroker.Publish("PlayerPreMove", {
				type: "PlayerPreMove",
				dir: -1,
				id: this.id,
			});
		}	
		else if (inputMap[this.rightKey])
		{
			this.game.MessageBroker.Publish("PlayerPreMove", {
				type: "PlayerPreMove",
				dir: 1,
				id: this.id,
			});
		}

		if (this.inventoryKeys)
		{
			var i = -1;
			while (++i < 3)
				if (inputMap[this.inventoryKeys[i]])
					this.UsePowerUp(i);
		}
	}

	public InstancePaddle(): ClientPaddle {
		return new ClientPaddle(this.game, this, 8);
	}
}
