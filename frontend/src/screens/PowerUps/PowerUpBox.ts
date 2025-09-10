import * as BABYLON from "@babylonjs/core";
import { Ball } from "../Collidable/Ball";
import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { PowerUpMoreLength } from "./PowerUpMoreLength";
import { PowerUpSpeedUp } from "./PowerUpSpeedUp";
import { Zone } from "../Utils/Zone";
import { IMesh } from "../Interfaces/IMesh";
import { PowerUpLessLength } from "./PowerUpLessLength";
import { PowerUpSpeedDown } from "./PowerUpSpeedDown";
import { PowerUpCreateBall } from "./PowerUpCreateBall";
import { Game } from "../Game/Game";
import { APongTable } from "../Game/APongTable";
import { PowerUpShield } from "./PowerUpShield";
import { GameEvent } from "@shared/types/types";
import { PowerUpType } from "@shared/types/messages";

export class PowerUpBox extends Zone {
    protected observable: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
    public X: number;
    public Z: number;
    public PowerUp: IPowerUp;

      // 🔑 Factories centralizadas
    private static factories: Record<PowerUpType, (game: Game) => IPowerUp> = {
        MoreLength: (game) => new PowerUpMoreLength(game),
        LessLength: (game) => new PowerUpLessLength(game),
        SpeedUp: (game) => new PowerUpSpeedUp(game),
        SpeedDown: (game) => new PowerUpSpeedDown(game),
        CreateBall: (game) => new PowerUpCreateBall(),
        Shield: (game) => new PowerUpShield(game),
    };

    constructor(game: Game, x: number, z: number, type?: PowerUpType) {
        super(game, 1.5, 1.5, 1.5);

        // let rewardTypes: (() => IPowerUp)[] = [];

        // rewardTypes.push(() => new PowerUpMoreLength(game));
        // rewardTypes.push(() => new PowerUpLessLength(game));
        // rewardTypes.push(() => new PowerUpSpeedUp(game));
        // rewardTypes.push(() => new PowerUpSpeedDown(game));
        // rewardTypes.push(() => new PowerUpCreateBall());
        // rewardTypes.push(() => new PowerUpShield(game));

        this.X = x;
        this.Z = z;
        this.mesh.position.set(x, 1, z);

        // Sobreescribir material de la zona.
        this.mesh.material = game.GetMaterial("PowerUp");
        
        // Animación visual para destacar el power-up
        this.observable = this.scene.onBeforeRenderObservable.add(() => {
            if (!this.IsDisposed())
                this.mesh.rotation.y += 0.02;
        });

        // 👉 Seleccionar power-up
        if (type) {
            this.PowerUp = PowerUpBox.factories[type](game);
        } else {
            const types = Object.keys(PowerUpBox.factories) as PowerUpType[];
            const randomType = types[Math.floor(Math.random() * types.length)];
            this.PowerUp = PowerUpBox.factories[randomType](game);
        }
        
        // Se añade a la lista de PowerUps.
        game.PowerUps.Add(this);
        
        // Registrarse a eventos.
        this.OnEnterEvent.Subscribe((iMesh) => this.PickUp(iMesh));

        // Notificar creación
        game.MessageBroker.Publish(GameEvent.CreatePowerUp, this);
    }

    private PickUp(iMesh: IMesh)
    {
        if (this.disposed)
            return;

        if (iMesh instanceof Ball && iMesh.Owner != null)
        {
            if (iMesh.IsDisposed())
                return;
            
            iMesh.Owner.Inventory.PickUpPwrUp(this.PowerUp);
            this.Dispose();
        }
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
