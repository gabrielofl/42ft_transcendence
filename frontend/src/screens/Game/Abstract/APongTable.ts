import * as BABYLON from "@babylonjs/core";
import { Event } from "@shared/utils/Event";
import { IPowerUpBox } from "src/screens/Game/Interfaces/IPowerUpBox";
import { ClientGame } from "../ClientGame";
import { DisposableMesh } from "./DisposableMesh";
import { ClientPowerUpBox } from "../PowerUps/ClientPowerUpBox";

export abstract class APongTable extends DisposableMesh {
    protected readonly MAX_POWERUPS = 5;
    public OnDisposeEvent: Event<void> = new Event();

	//private obstacles: Obstacle[];
    protected game: ClientGame;

	constructor(game: ClientGame) {
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateGround("table", {
            width: game.Map.size.width, height: game.Map.size.height }, scene);
        super (game, fMeshBuilder);

        this.game = game;
/*         this.obstacles = game.Map.obstacles.map(o => 
            new Obstacle(game, o.length, new BABYLON.Vector2(o.position[0], o.position[1]), o.rotation, o.life)
        ); */
	}

    /**
     * Disposes TableGround, Walls and obstacles.
     */
    public Dispose(): void {
/*         this.obstacles.forEach(o => o.Dispose());
        this.obstacles = []; */
        let pwrUps: ClientPowerUpBox[] = this.game.PowerUps.GetAll();
        this.game.PowerUps.OnRemoveEvent.Clear();
        pwrUps.forEach(p => {
            p.Dispose();
            this.game.PowerUps.Remove(p);
        });
        super.Dispose();
    }
}
