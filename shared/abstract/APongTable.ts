import * as BABYLON from "@babylonjs/core";
import { Event } from "@shared/utils/Event";
import { DisposableMesh } from "../utils/DisposableMesh";
import { IPowerUpBox } from "@shared/interfaces/IPowerUpBox";
import { AGame } from "./AGame";

export abstract class APongTable extends DisposableMesh {
    protected readonly MAX_POWERUPS = 5;
    public OnDisposeEvent: Event<void> = new Event();

	//private obstacles: Obstacle[];
    protected game: AGame;

	constructor(game: AGame) {
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
        let pwrUps: IPowerUpBox[] = this.game.PowerUps.GetAll();
        this.game.PowerUps.OnRemoveEvent.Clear();
        pwrUps.forEach(p => {
            p.Dispose();
            this.game.PowerUps.Remove(p);
        });
        super.Dispose();
    }
}
