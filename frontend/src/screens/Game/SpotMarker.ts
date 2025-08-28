import * as BABYLON from "@babylonjs/core";
import { IDisposable } from "@shared/interfaces/IDisposable";
import { Event } from "@shared/utils/Event";
import { ClientGame } from "./ClientGame";
import { DisposableMesh } from "@shared/utils/DisposableMesh";

/**
 * Marker used when selecting maps.
 */
export class SpotMarker implements IDisposable {
    OnDisposeEvent: Event<void> = new Event();

    private root: BABYLON.TransformNode;
    private body: DisposableMesh;
    private head: DisposableMesh;
    private isDisposed: boolean = false;

    constructor(game: ClientGame, position: BABYLON.Vector3) {
        const scene = game.GetScene(this);

        // Nodo raíz para agrupar las partes
        this.root = new BABYLON.TransformNode("dummyRoot", scene);
        this.root.position = position.clone();

        // Cuerpo (pirámide invertida)
        let fBodyBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateCylinder("dummyBody", {
            height: 2.1,
            diameterTop: 1.2,
            diameterBottom: 0,
        }, scene);
        this.body = new DisposableMesh(game, fBodyBuilder);
        let bodyMesh = this.body.GetMesh();
        bodyMesh.parent = this.root;
        bodyMesh.position.y = 0.6;

        // Cabeza (esfera encima)
        let fHeadBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateSphere("dummyHead", {
            diameter: 1.2
        }, scene);
        this.head = new DisposableMesh(game, fHeadBuilder);
        let headMesh = this.head.GetMesh();
        headMesh.parent = this.root;
        headMesh.position.y = 2.4;
    }

    public GetMesh(): BABYLON.TransformNode {
        return this.root;
    }

    public Dispose(): void {
        if (this.isDisposed) 
            return;
    
        this.isDisposed = true;
        this.OnDisposeEvent.Invoke();
        this.OnDisposeEvent.Clear();
        this.body.Dispose();
        this.head.Dispose();
        this.root.dispose();
    }

    public IsDisposed(): boolean {
        return this.isDisposed;
    }
}
