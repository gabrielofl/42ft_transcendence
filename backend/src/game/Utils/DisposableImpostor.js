import * as BABYLON from "@babylonjs/core";
import { AGame } from "../abstract/AGame.js";
import { DisposableMesh } from "./DisposableMesh.js";

export class DisposableImpostor extends DisposableMesh {
    impostor;// BABYLON.PhysicsImpostor;

    /**
     * 
     * @param {AGame} game 
     * @param {(scene: BABYLON.Scene) => BABYLON.Mesh} fMeshBuilder 
     * @param {number} mass 
     */
    constructor (game, fMeshBuilder, mass)
    {
        super(game, fMeshBuilder);
        this.mesh.physicsImpostor = this.impostor = new BABYLON.PhysicsImpostor(
            this.mesh,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: mass, restitution: 1 }, // restitution: rebote perfecto
            this.scene
        );
    }

    /**
     * Devuelve el impostor.
     * @returns {BABYLON.PhysicsImpostor}
     */
    GetImpostor() {
        return this.impostor;
    }
}