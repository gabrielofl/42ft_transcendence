import * as BABYLON from "@babylonjs/core";
import { ServerBall } from "../Collidable/ServerBall";
import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { PowerUpMoreLength } from "./PowerUpMoreLength";
import { PowerUpSpeedUp } from "./PowerUpSpeedUp";
import { Zone } from "../../frontend/src/screens/Utils/Zone";
import { PowerUpLessLength } from "./PowerUpLessLength";
import { PowerUpSpeedDown } from "./PowerUpSpeedDown";
import { PowerUpCreateBall } from "./PowerUpCreateBall";
import { ServerGame } from "../Game/ServerGame";
import { PowerUpShield } from "./PowerUpShield";
import { PowerUpType } from "@shared/types/messages";
import { APlayer } from "../../frontend/src/screens/Player/APlayer";
import { IPowerUpBox } from "@shared/interfaces/IPowerUpBox";
import { AGame } from "../abstract/AGame";

export class ServerPowerUpBox extends Zone implements IPowerUpBox {
    protected observable: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
    public X: number;
    public Z: number;
    public PowerUp: IPowerUp;
    public ID: number;

    constructor(game: ServerGame, x: number, z: number, type?: PowerUpType) {
        super(game, 1.5, 1.5, 1.5);

        this.X = x;
        this.Z = z;
        this.mesh.position.set(x, 1, z);
        
        // Animación visual para destacar el power-up
        this.observable = this.scene.onBeforeRenderObservable.add(() => {
            if (!this.IsDisposed())
                this.mesh.rotation.y += 0.02;
        });

        // 👉 Seleccionar power-up
        if (type) {
            this.PowerUp = AGame.PowerUpFactory[type](game);
        } else {
            const types = Object.keys(AGame.PowerUpFactory) as PowerUpType[];
            const randomType = types[Math.floor(Math.random() * types.length)];
            type = randomType;
            this.PowerUp = AGame.PowerUpFactory[randomType](game);
        }

        let id = 0;
        let powerUps: IPowerUpBox[] = game.PowerUps.GetAll();
        while (powerUps.Any(p => p.ID === id))
            id++;
        this.ID = id;
        
        // Se añade a la lista de PowerUps.
        game.PowerUps.Add(this);
        
        // Registrarse a eventos.
        this.OnEnterEvent.Subscribe((iMesh) => { 
            if (iMesh instanceof ServerBall && !iMesh.IsDisposed() && iMesh.Owner != null)
                this.PickUp(iMesh.Owner);
        });

        // Notificar creación
        game.MessageBroker.Publish("CreatePowerUp", {
            type: "CreatePowerUp",
            id: id,
            x: x,
            z: z,
            powerUpType: type,
        });
    }

    public PickUp(player: APlayer)
    {
        if (this.disposed)
            return;

        player.Inventory.PickUpPwrUp(this.PowerUp);
        this.game.MessageBroker.Publish("PickPowerUpBox", {
            type: "PickPowerUpBox",
            username: player.GetName(),
            id: this.ID
        });
        this.Dispose();
    }

    /**
     * Clear al subscriptions.
     */
    public Dispose(): void {
        super.Dispose();
        this.OnEnterEvent.Clear();
        this.game.PowerUps.Remove(this);
        this.scene.onBeforeRenderObservable.remove(this.observable);
    }
}
