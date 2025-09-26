import * as BABYLON from "@babylonjs/core";
import { ServerBall } from "./ServerBall.js";
import { DisposableImpostor } from "../Utils/DisposableImpostor.js";

export class ServerWall extends DisposableImpostor {
    static GROUP = 2;
    length = 1;
    game;
    
	constructor(game, length, center, rotation) {
        let fMeshBuilder = (scene) => BABYLON.MeshBuilder.CreateBox("wall", { width: length, height: 3.5, depth: 1}, scene);
        super(game, fMeshBuilder, 0);
        this.PositionMesh(this.mesh, center, rotation);
        
        this.game = game;
        if (this.mesh.physicsImpostor != undefined)
		{
			this.mesh.physicsImpostor.physicsBody.collisionFilterGroup = ServerWall.GROUP;
			this.mesh.physicsImpostor.physicsBody.collisionFilterMask = ServerBall.GROUP;
		}
	}

    PositionMesh(mesh, center, rotation) {
        mesh.position.x = center.x;
        mesh.position.z = center.y;
        mesh.position.y = 0.5;
        mesh.rotate(BABYLON.Vector3.Up(), rotation, BABYLON.Space.LOCAL);
    }
}
