import * as BABYLON from "@babylonjs/core";
import { APlayer } from "../../Player/APlayer.js";
import { DisposableMesh } from "../../Utils/DisposableMesh.js";
import { APlayerEffect } from "../../abstract/APlayerEffect.js";
import { logToFile } from "../../Game/logger.js";

export class PaddleShieldEffect extends APlayerEffect {
    shield;
    
    constructor(game, imgPath, durationMs = 5000) {
        super(game, imgPath, durationMs);
    }

    /**
     * 
     * @param {APlayer} target 
     * @returns 
     */
    Execute(target) {
        logToFile("PaddleShieldEffect Execute Start");
        if (this.disposed || target !== this.Origin) 
            return;

        target.Shields.Add(this);
        this.shield = this.CreateShieldMesh(target);

        // Limpiar efectos negativos
        target.Effects.GetAll().Where(e => e.IsNegative).forEach(e => e.Undo(target));
        super.Execute(target);
        logToFile("PaddleShieldEffect Execute End");
    }

    /**
     * 
     * @param {APlayer} target 
     */
    Undo(target) {
        target.Shields.Remove(this);
        this.Dispose();
    }

    Dispose() {
        this.shield?.Dispose();
        super.Dispose();
    }

    /**
     * 
     * @param {APlayer} target 
     * @returns {DisposableMesh}
     */
    CreateShieldMesh(target) {
        console.log("Shield len: " + target.PaddleLen.Value());

        // Crear esfera elipsoidal
        let fMeshBuilder = (scene) => BABYLON.MeshBuilder.CreateSphere("shield", {
            diameterX: target.PaddleLen.Value() + 2,
            diameterY: 3,
            diameterZ: 3 
        }, scene);
        let shield = new DisposableMesh(this.game, fMeshBuilder);
        let mesh = shield.GetMesh();

        if (this.game instanceof ClientGame)
            mesh.material = this.game.GetMaterial("Shield");

        // Hacer que el escudo siga a la pala o jugador
        let paddle = target.GetPaddle();

        // Rehacer el escudo si la pala se ha eliminado.
        target.OnPaddleCreated.Subscribe((player) => {
            if (!this.shield?.IsDisposed())
                this.shield?.Dispose();
            this.shield = this.CreateShieldMesh(player)
        });

        mesh.parent = paddle.GetMesh();
        return shield;
    }
}
