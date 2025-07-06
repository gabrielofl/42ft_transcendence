import { DisposableMesh } from "./DisposableMesh";
import * as BABYLON from "@babylonjs/core";

export class DisposableImpostor extends DisposableMesh {
    private impostor: BABYLON.PhysicsImpostor;

    constructor (fMeshBuilder: (scene: BABYLON.Scene) => BABYLON.Mesh, mass: number)
    {
        super(fMeshBuilder);
        this.mesh.physicsImpostor = this.impostor = new BABYLON.PhysicsImpostor(
            this.mesh,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: mass, restitution: 1 }, // restitution: rebote perfecto
            this.scene
        );
    }

    // Devuelve el impostor.
    public GetImpostor(): BABYLON.PhysicsImpostor {
        return this.impostor;
    }
}