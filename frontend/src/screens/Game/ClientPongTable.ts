import * as BABYLON from "@babylonjs/core";
import { ClientWall } from "../Collidable/ClientWall";
import { ClientGame } from "./ClientGame";
import { SpotMarker } from "./SpotMarker";
import { APongTable } from "./Abstract/APongTable";

export class ClientPongTable extends APongTable {
    private markers: SpotMarker[] = [];
    protected game: ClientGame;
    private walls: ClientWall[];
    
    constructor(game: ClientGame, preview: boolean = false) {
        super(game);
        this.game = game;

        this.mesh.material = game.GetMaterial("PongTable");
        this.walls = game.Map.walls.map(w =>
            new ClientWall(game, w.length, new BABYLON.Vector2(w.position[0], w.position[1]), w.rotation)
        );

        if (preview)
            this.markers = game.Map.spots.map(s => new SpotMarker(game, s));
    }

    public Dispose(): void {
        this.walls.forEach(w => w.Dispose());
        this.walls = [];
        this.markers.forEach(m => m.Dispose());
        this.markers = [];
        super.Dispose();
    }
}