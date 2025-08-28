import * as BABYLON from "@babylonjs/core";
import { DisposableMesh } from "./DisposableMesh";
import { IMesh } from "../interfaces/IMesh";
import { Event } from "@shared/utils/Event";
import { ServerGame } from "../Game/ServerGame";

export class Zone extends DisposableMesh {
    public OnEnterEvent: Event<IMesh> = new Event();
    public OnLeaveEvent: Event<IMesh> = new Event();
    protected recentCollided: boolean = false;
    protected game: ServerGame;

    constructor(game: ServerGame, width: number, height: number, depth: number) {
        super(game, (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("zone", { width: width, height: height, depth: depth }, scene));

        this.game = game;

        // TODO Eliminar ya que materiales es tema de back.
        let mat = new BABYLON.StandardMaterial("zone", this.scene);
        mat.alpha = 0.25;
        this.mesh.material = mat;
        // this.mesh.material = game.GetMaterial("Transparent");

        // TODO: Analizar patrón observer.
        game.Zones.Add(this);
        this.OnDisposeEvent.Subscribe(() => game.Zones.Remove(this));

        // Revisar si una bola ha entrado.
        this.scene.onBeforeRenderObservable.add(() => {
            game.Balls.GetAll().forEach(ball => this.CheckMeshInside(ball));
        });
    }

    public CheckMeshInside(iMesh: IMesh): void {
        if (this.disposed)
            return;
        
        const isColliding = this.mesh.intersectsMesh(iMesh.GetMesh(), false); // Usa bounding box para rendimiento
        // Si está colisionando pero antes no lo estaba → NUEVA COLISIÓN
        if (isColliding && !this.recentCollided) {
            this.recentCollided = true;
            this.OnEnterEvent.Invoke(iMesh);
            return;
        }

        // Si ya no colisiona, reseteamos la bandera
        if (!isColliding && this.recentCollided) {
            this.recentCollided = false;
            this.OnLeaveEvent.Invoke(iMesh);
        }
    }
}