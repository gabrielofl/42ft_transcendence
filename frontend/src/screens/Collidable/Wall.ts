import * as BABYLON from "@babylonjs/core";
import { Ball } from "./Ball";
import { DisposableImpostor } from "../Utils/DisposableImpostor";
import { DisposableMesh } from "../Utils/DisposableMesh";
import { Game } from "../Game/Game";

export class Wall extends DisposableImpostor {
    public static GROUP: number = 2;
    protected length: number = 1;
    private coloredmesh: DisposableMesh; 
    
	constructor(length: number, center: BABYLON.Vector2, rotation: number) {
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("wall", { width: length, height: 3.5, depth: 1}, scene);
        super(fMeshBuilder, 0);
        this.PositionMesh(this.mesh, center, rotation);

        let fTMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("colorwall", { width: length, height: 1, depth: 1}, scene);
        this.coloredmesh = new DisposableMesh(fTMeshBuilder);
        let tMesh = this.coloredmesh.GetMesh();
        this.PositionMesh(tMesh, center, rotation);
        tMesh.material = Game.GetInstance().GetMaterial("Wall");
        this.OnDisposeEvent.Subscribe(() => this.coloredmesh.Dispose());

        this.mesh.material = Game.GetInstance().GetMaterial("Transparent");
        if (this.mesh.physicsImpostor != undefined)
		{
			this.mesh.physicsImpostor.physicsBody.collisionFilterGroup = Wall.GROUP;
			this.mesh.physicsImpostor.physicsBody.collisionFilterMask = Ball.GROUP;
		}
	}

    private PositionMesh(mesh: BABYLON.Mesh, center: BABYLON.Vector2, rotation: number): void {
        mesh.position.x = center.x;
        mesh.position.z = center.y;
        mesh.position.y = 0.5;
        mesh.rotate(BABYLON.Vector3.Up(), rotation, BABYLON.Space.LOCAL);
    }
}
