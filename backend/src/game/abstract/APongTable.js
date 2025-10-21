import * as BABYLON from "@babylonjs/core";
import { Event } from "../Utils/Event.js";
import { DisposableMesh } from "../Utils/DisposableMesh.js";
import { AGame } from "./AGame.js";

export class APongTable extends DisposableMesh {
    MAX_POWERUPS = 0;
    OnDisposeEvent = new Event();//: Event<void>

	//private obstacles: Obstacle[];
    game;//: AGame

    /**
     * 
     * @param {AGame} game 
     */
	constructor(game) {
        let fMeshBuilder = (scene) => BABYLON.MeshBuilder.CreateGround("table", {
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
    Dispose() {
/*         this.obstacles.forEach(o => o.Dispose());
        this.obstacles = []; */
        let pwrUps = this.game.PowerUps.GetAll();//: IPowerUpBox[]
        this.game.PowerUps.OnRemoveEvent.Clear();
        pwrUps.forEach(p => {
            p.Dispose();
            this.game.PowerUps.Remove(p);
        });
        super.Dispose();
    }
}
