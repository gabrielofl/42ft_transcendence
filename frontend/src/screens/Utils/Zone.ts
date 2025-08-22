import * as BABYLON from "@babylonjs/core";
import { DisposableMesh } from "./DisposableMesh";
import { IMesh } from "../Interfaces/IMesh";
import { PongTable } from "../Game/PongTable";
import { Event } from "./Event";
import { Game } from "../Game/Game";

export class Zone extends DisposableMesh {
    public OnEnterEvent: Event<IMesh> = new Event();
    public OnLeaveEvent: Event<IMesh> = new Event();
    protected recentCollided: boolean = false;

    constructor(width: number, height: number, depth: number) {
        super((scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("zone", { width: width, height: height, depth: depth }, scene));

        this.mesh.material = Game.GetInstance().GetMaterial("Transparent");

        // TODO: Analizar patrón observer.
        PongTable.Zones.Add(this);
        this.OnDisposeEvent.Subscribe(() => PongTable.Zones.Remove(this));

        // Revisar si una bola ha entrado.
        this.scene.onBeforeRenderObservable.add(() => {
            PongTable.Balls.GetAll().forEach(ball => this.CheckMeshInside(ball));
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