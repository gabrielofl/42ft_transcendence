import * as BABYLON from "@babylonjs/core";
import { Game } from "../../Game/Game";
import { APlayer } from "../../Player/APlayer";
import { APlayerEffect, AppliedEffectArgs } from "../Effects/APlayerEffect";
import { DisposableMesh } from "../../Utils/DisposableMesh";
import { GameEvent, MessageBroker } from "../../Utils/MessageBroker";

export class PaddleShieldEffect extends APlayerEffect {
    private shield: DisposableMesh | undefined;
    
    constructor(imgPath: string, durationMs: number = 5000) {
        super(imgPath, durationMs);
    }

    public Execute(target: APlayer): void {
        if (this.disposed || target !== this.Origin) 
            return;

        target.Shields.Add(this);
        this.shield = this.CreateShieldMesh(target);

        // Limpiar efectos negativos
        target.Effects.GetAll().Where(e => e.IsNegative).forEach(e => e.Undo(target));
        MessageBroker.Publish<AppliedEffectArgs>(GameEvent.AppliedEffect, { Target: target, Effect: this });
        super.Execute(target);
    }

    public Undo(target: APlayer): void {
        target.Shields.Remove(this);
        this.Dispose();
    }

    private CreateShieldMesh(target: APlayer): DisposableMesh {
        let game: Game = Game.GetInstance();

        console.log("Shield len: " + target.PaddleLen.Value());

        // Crear esfera elipsoidal
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateSphere("shield", {
            diameterX: target.PaddleLen.Value() + 2,
            diameterY: 3,
            diameterZ: 3 
        }, scene);
        let shield: DisposableMesh = new DisposableMesh(fMeshBuilder);
        let mesh = shield.GetMesh();
        mesh.material = game.GetMaterial("Shield");

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

