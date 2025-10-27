import * as BABYLON from "@babylonjs/core";
import { Event } from "../Utils/Event.js";
import { logToFile } from "../Game/logger.js";
import { ServerGame } from "../Game/ServerGame.js";

// Clase para facilitar el manejo de una Mesh.
export class DisposableMesh { //implements IMesh, IDisposable
    OnDisposeEvent = new Event();//: Event<void>
    disposed = false;//: boolean
    mesh;//: BABYLON.Mesh
    scene;//: BABYLON.Scene

    /**
     * 
     * @param {ServerGame} game 
     * @param {(scene: BABYLON.Scene) => BABYLON.Mesh} fMeshBuilder 
     */
    constructor(game, fMeshBuilder) {
        this.scene = game.GetScene(this);
        this.mesh = fMeshBuilder(this.scene);
    }

    // Hace un dispose de la Mesh, invoca los eventos OnDispose y retira la Mesh de Scene.
    Dispose() {
        if (this.disposed)
            return;
        
        logToFile("Disposing mesh Start");
        this.disposed = true;
        this.OnDisposeEvent.Invoke();
        this.OnDisposeEvent.Clear();

        if (this.mesh)
        {
            logToFile("Disposing mesh");
            this.scene.removeMesh(this.mesh);
            this.mesh.isEnabled(false);
            this.mesh.dispose();
        }
        logToFile("Disposing mesh End");
    }

    /**
     * Devuelve true si se ha llamado a la función Dispose.
     * @returns {boolean}
     */
    IsDisposed() {
        return this.disposed;
    }

    /**
     * Devuelve el Mesh.
     * @returns {BABYLON.Mesh}
     */
    GetMesh() {
        return this.mesh;
    }
}