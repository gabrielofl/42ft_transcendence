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
import { APlayer } from "../Player/APlayer";
import { IPowerUpBox } from "@shared/interfaces/IPowerUpBox";

export class ServerPowerUpBox extends Zone implements IPowerUpBox {
    protected observable: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
    public X: number;
    public Z: number;
    public PowerUp: IPowerUp;
    public ID: number;
    
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
            this.PowerUp = ServerPowerUpBox.factories[type](game);
        } else {
            const types = Object.keys(ServerPowerUpBox.factories) as PowerUpType[];
            const randomType = types[Math.floor(Math.random() * types.length)];
            this.PowerUp = ServerPowerUpBox.factories[randomType](game);
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
            if (iMesh instanceof Ball && !iMesh.IsDisposed() && iMesh.Owner != null)
                this.PickUp(iMesh.Owner);
        });

        // Notificar creación
        game.MessageBroker.Publish(GameEvent.CreatePowerUp, this);
    }

    public PickUp(player: APlayer)
    {
        if (this.disposed)
            return;

        player.Inventory.PickUpPwrUp(this.PowerUp);
        this.game.MessageBroker.Publish(GameEvent.PickedPowerUp, {username: player.GetName(), id: this.ID});
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
