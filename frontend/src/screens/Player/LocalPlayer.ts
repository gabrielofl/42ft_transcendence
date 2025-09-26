import { APlayer } from "./APlayer";
import { PongTable } from "../Game/PongTable";

export class LocalPlayer extends APlayer {
	private leftKey: string;
	private rightKey: string;
	private inventoryKeys: [string, string, string] | undefined;

	constructor(name: string, id: number, leftKey: string, rightKey: string, skills?: [string, string, string]) {
		super(name, id);
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
		if (!inputMap || PongTable.Paused)
			return;

		if (inputMap[this.leftKey]) 
			this.paddle.Move(-1);
		else if (inputMap[this.rightKey])
			this.paddle.Move(1);

		if (this.inventoryKeys)
		{
			var i = -1;
			while (++i < 3)
				if (inputMap[this.inventoryKeys[i]])
					this.UsePowerUp(i);
		}
	}
}
