import * as BABYLON from "@babylonjs/core";
import { Ball } from "../Collidable/Ball";
import { Wall } from "../Collidable/Wall";
import { PowerUpBox } from "../PowerUps/PowerUpBox";
import { Obstacle } from "../Collidable/Obstacle";
import { Zone } from "../Utils/Zone";
import { IMesh } from "../Interfaces/IMesh";
import { Event } from "../Utils/Event";
import { ObservableList } from "../Utils/ObservableList";
import { GameEvent, MessageBroker } from "../Utils/MessageBroker";
import { Game } from "./Game";
import { DisposableMesh } from "../Utils/DisposableMesh";
import { SpotMarker } from "../Player/SpotMarker";
import { IPowerUp } from "../PowerUps/IPowerUp";

export class PongTable extends DisposableMesh {
    private readonly MAX_POWERUPS = 15;
    public OnDisposeEvent: Event<void> = new Event();

	private walls: Wall[];
	private markers: SpotMarker[] = [];
	private obstacles: Obstacle[];
    private gameZone: Zone;
    private game: Game;

	constructor(game: Game, preview: boolean = false) {
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

        if (preview)
            this.markers = game.Map.spots.map(s => new SpotMarker(game, s));
        
        // Crear PowerUps
        var i = 0;
        while (++i <= this.MAX_POWERUPS) {
            this.CreatePowerUp();
        }
        game.PowerUps.OnRemoveEvent.Subscribe((pwrUp) => this.CreatePowerUp());
        
		this.mesh.material = game.GetMaterial("PongTable");;
        this.gameZone = new Zone(game, game.Map.size.width, 10, game.Map.size.height);
        this.gameZone.OnLeaveEvent.Subscribe((iMesh) => this.BallLeaveGameZone(iMesh));

        this.game.MessageBroker.Subscribe(GameEvent.GamePause, (paused) => game.Paused = paused);
	}

    public CreatePowerUp(): void {
        setTimeout(() => new PowerUpBox(this.game, this.game.Map.size.width, this.game.Map.size.height), 2000);
    }

    /**
     * All Balls are subscribed to this method to avoid balls scaping from table.
     * @param iMesh Ball mesh.
     */
    public BallLeaveGameZone(iMesh: IMesh): void {
        if (iMesh instanceof Ball)
            iMesh.Dispose();
    }

    /**
     * Disposes TableGround, Walls and obstacles.
     */
    public Dispose(): void {
        this.walls.forEach(w => w.Dispose());
        this.walls = [];
        this.obstacles.forEach(o => o.Dispose());
        this.obstacles = [];
        this.markers.forEach(m => m.Dispose());
        this.markers = [];
        let pwrUps: PowerUpBox[] = this.game.PowerUps.GetAll();
        this.gameZone.Dispose();
        this.game.PowerUps.OnRemoveEvent.Clear();
        pwrUps.forEach(p => {
            p.Dispose();
            this.game.PowerUps.Remove(p);
        });
        super.Dispose();
    }
}
