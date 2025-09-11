import * as BABYLON from "@babylonjs/core";
import * as MAPS from "./Maps";
import { Ball } from "../Collidable/Ball";
import { Wall } from "../Collidable/Wall";
import { PowerUpBox } from "../PowerUps/PowerUpBox";
import { MapDefinition } from "./Maps";
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
    public static Zones: ObservableList<Zone> = new ObservableList();
    public static Balls: ObservableList<Ball> = new ObservableList();
    public static PowerUps: ObservableList<PowerUpBox> = new ObservableList();
    public static Map: MapDefinition = MAPS.BaseMap;
    public static Paused: boolean = false;
    public OnDisposeEvent: Event<void> = new Event();

	private walls: Wall[];
	private markers: SpotMarker[] = [];
	private obstacles: Obstacle[];
    private gameZone: Zone;

	constructor(preview: boolean = false) {
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateGround("table", {
            width: PongTable.Map.size.width, height: PongTable.Map.size.height }, scene);
        super (fMeshBuilder);

        this.walls = PongTable.Map.walls.map(w =>
            new Wall(w.length, new BABYLON.Vector2(w.position[0], w.position[1]), w.rotation)
        );
        this.obstacles = PongTable.Map.obstacles.map(o => 
            new Obstacle(o.length, new BABYLON.Vector2(o.position[0], o.position[1]), o.rotation, o.life)
        );

        if (preview)
            this.markers = PongTable.Map.spots.map(s => new SpotMarker(s));
        
        // Crear PowerUps
        var i = 0;
        while (++i <= this.MAX_POWERUPS) {
            this.CreatePowerUp();
        }
        PongTable.PowerUps.OnRemoveEvent.Subscribe((pwrUp) => this.CreatePowerUp());
        
		this.mesh.material = Game.GetInstance().GetMaterial("PongTable");;
        this.gameZone = new Zone(PongTable.Map.size.width, 10, PongTable.Map.size.height);
        this.gameZone.OnLeaveEvent.Subscribe((iMesh) => this.BallLeaveGameZone(iMesh));

        MessageBroker.Subscribe<boolean>(GameEvent.GamePause, (paused) => PongTable.Paused = paused);
	}

    public CreatePowerUp(): void {
        setTimeout(() => new PowerUpBox(PongTable.Map.size.width, PongTable.Map.size.height), 2000);
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
        let pwrUps: PowerUpBox[] = PongTable.PowerUps.GetAll();
        this.gameZone.Dispose();
        PongTable.PowerUps.OnRemoveEvent.Clear();
        pwrUps.forEach(p => {
            p.Dispose();
            PongTable.PowerUps.Remove(p);
        });
        super.Dispose();
    }
}
