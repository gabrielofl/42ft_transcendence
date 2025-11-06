import * as BABYLON from "@babylonjs/core";
import { DisposableMesh } from "../../Abstract/DisposableMesh";
import { ClientGame } from "../../ClientGame";
import { APlayerEffect } from "../../Abstract/APlayerEffect";
import { APlayer } from "../../Player/APlayer";

export class PaddleShieldEffect extends APlayerEffect {
    private shield: DisposableMesh | undefined;
    
    constructor(game: ClientGame, imgPath: string, durationMs: number = 5000) {
        super(game, imgPath, durationMs);
    }

    public Execute(target: APlayer): void {
        if (this.disposed) 
            return;

        target.Shields.Add(this);
        this.shield = this.CreateShieldMesh(target);

        // Limpiar efectos negativos
        target.Effects.GetAll().Where(e => e.IsNegative).forEach(e => e.Undo(target));
        super.Execute(target);
    }

    public Undo(target: APlayer): void {
        target.Shields.Remove(this);
        this.Dispose();
    }

    private CreateShieldMesh(target: APlayer): DisposableMesh {
        console.log("Shield len: " + target.PaddleLen.Value());

        // Crear esfera elipsoidal
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateSphere("shield", {
            diameterX: target.PaddleLen.Value() + 2,
            diameterY: 3,
            diameterZ: 3 
        }, scene);
        let shield: DisposableMesh = new DisposableMesh(this.game, fMeshBuilder);
        let mesh = shield.GetMesh();

        if (this.game instanceof ClientGame)
            mesh.material = this.game.GetMaterial("Shield");

        // Hacer que el escudo siga a la pala o jugador
        let paddle = target.GetPaddle();

        // Rehacer el escudo si la pala se ha eliminado.
        target.OnPaddleCreatedEvent.Subscribe(this.PaddleCreatedHandler);
        mesh.parent = paddle.GetMesh();
        return shield;
    }

    private PaddleCreatedHandler = (player: APlayer): void => {
        if (this.disposed)
            return;

        if (!this.shield?.IsDisposed())
            this.shield?.Dispose();
        this.shield = this.CreateShieldMesh(player);
    }
    
    public Dispose(): void {
        if (this.Origin) {
            this.Origin.OnPaddleCreatedEvent.Unsubscribe(this.PaddleCreatedHandler);
        }
        this.shield?.Dispose();
        super.Dispose();
    }
}

