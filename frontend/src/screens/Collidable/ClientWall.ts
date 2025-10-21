import * as BABYLON from "@babylonjs/core";
import { ClientGame } from "../Game/ClientGame";
import { ClientBall } from "./ClientBall";
import { DisposableMesh } from "../Game/Abstract/DisposableMesh";

export class ClientWall extends DisposableMesh {
    public static GROUP: number = 2;
    protected length: number = 1;
    protected game: ClientGame;
    
    constructor(game: ClientGame, length: number, center: BABYLON.Vector2, rotation: number) {
            let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("colorwall", { width: length, height: 1, depth: 1}, scene);
            super(game, fMeshBuilder);
            
            this.game = game;
            this.PositionMesh(this.mesh, center, rotation);
            this.mesh.material = game.GetMaterial("Wall");
        }
    
        private PositionMesh(mesh: BABYLON.Mesh, center: BABYLON.Vector2, rotation: number): void {
            mesh.position.x = center.x;
            mesh.position.z = center.y;
            mesh.position.y = 0.5;
            mesh.rotate(BABYLON.Vector3.Up(), rotation, BABYLON.Space.LOCAL);
        }
}