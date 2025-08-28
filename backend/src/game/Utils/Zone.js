import * as BABYLON from "@babylonjs/core";
import { DisposableMesh } from "./DisposableMesh.js";
import { Event } from "./Event.js";
import { ServerGame } from "../Game/ServerGame.js";

export class Zone extends DisposableMesh {
    OnEnterEvent = new Event();//Event<IMesh>
    OnLeaveEvent = new Event();//Event<IMesh>
    recentCollided = false;// boolean
    game;// ServerGame

    /**
     * 
     * @param {ServerGame} game 
     * @param {number} width 
     * @param {number} height 
     * @param {number} depth 
     */
    constructor(game, width, height, depth) {
        super(game, (scene) => BABYLON.MeshBuilder.CreateBox("zone", { width: width, height: height, depth: depth }, scene));

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

    /**
     * 
     * @param {IMesh} iMesh
     * @returns 
     */
    CheckMeshInside(iMesh) {
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