import * as BABYLON from "@babylonjs/core";
import { Wall } from "../Collidable/Wall";
import { PowerUpBox } from "../PowerUps/PowerUpBox";
import { Obstacle } from "../Collidable/Obstacle";
import { Event } from "@shared/utils/Event";
import { Game } from "./Game";
import { DisposableMesh } from "../Utils/DisposableMesh";

export abstract class APongTable extends DisposableMesh {
    protected readonly MAX_POWERUPS = 15;
    public OnDisposeEvent: Event<void> = new Event();

	private walls: Wall[];
	private obstacles: Obstacle[];
    protected game: Game;

	constructor(game: Game) {
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateGround("table", {
            width: game.Map.size.width, height: game.Map.size.height }, scene);
        super (game, fMeshBuilder);

        this.game = game;
        this.walls = game.Map.walls.map(w =>
            new Wall(game, w.length, new BABYLON.Vector2(w.position[0], w.position[1]), w.rotation)
        );
        this.obstacles = game.Map.obstacles.map(o => 
            new Obstacle(game, o.length, new BABYLON.Vector2(o.position[0], o.position[1]), o.rotation, o.life)
        );
	}

    public abstract CreatePowerUp(x: number, z: number): void;
    public CopyPowerUp(box: PowerUpBox) {}

    /**
     * Disposes TableGround, Walls and obstacles.
     */
    public Dispose(): void {
        this.walls.forEach(w => w.Dispose());
        this.walls = [];
        this.obstacles.forEach(o => o.Dispose());
        this.obstacles = [];
        let pwrUps: PowerUpBox[] = this.game.PowerUps.GetAll();
        this.game.PowerUps.OnRemoveEvent.Clear();
        pwrUps.forEach(p => {
            p.Dispose();
            this.game.PowerUps.Remove(p);
        });
        super.Dispose();
    }
}
