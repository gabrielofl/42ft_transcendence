import * as BABYLON from "@babylonjs/core";
import { IMesh } from "../interfaces/IMesh";
import { Event } from "@shared/utils/Event";
import { IDisposable } from "@shared/interfaces/IDisposable";
import { AGame } from "../abstract/AGame";

// Clase para facilitar el manejo de una Mesh.
export class DisposableMesh implements IMesh, IDisposable {
    public OnDisposeEvent: Event<void> = new Event();
    protected disposed: boolean = false;
    protected mesh: BABYLON.Mesh;
    protected scene: BABYLON.Scene;

    constructor(game: AGame, fMeshBuilder: (scene: BABYLON.Scene) => BABYLON.Mesh) {
        this.scene = game.GetScene(this);
        this.mesh = fMeshBuilder(this.scene);
    }

    // Hace un dispose de la Mesh, invoca los eventos OnDispose y retira la Mesh de Scene.
    public Dispose(): void {
        if (this.disposed)
            return;

        this.disposed = true;
        this.OnDisposeEvent.Invoke();
        this.OnDisposeEvent.Clear();

        if (this.mesh)
        {
            this.scene.removeMesh(this.mesh);
            this.mesh.isEnabled(false);
            this.mesh.dispose();
        }
    }

    // Devuelve true si se ha llamado a la función Dispose.
    public IsDisposed(): boolean {
        return this.disposed;
    }

    // Devuelve el Mesh.
    public GetMesh(): BABYLON.Mesh {
        return this.mesh;
    }
}