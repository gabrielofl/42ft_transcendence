import * as BABYLON from "@babylonjs/core";
import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { PowerUpMoreLength } from "./PowerUpMoreLength";
import { PowerUpSpeedUp } from "./PowerUpSpeedUp";
import { PowerUpLessLength } from "./PowerUpLessLength";
import { PowerUpSpeedDown } from "./PowerUpSpeedDown";
import { PowerUpCreateBall } from "./PowerUpCreateBall";
import { Game } from "../Game/Game";
import { PowerUpShield } from "./PowerUpShield";
import { PowerUpType } from "@shared/types/messages";
import { IPowerUpBox } from "../../../../shared/interfaces/IPowerUpBox";
import { DisposableMesh } from "../Utils/DisposableMesh";
import { APlayer } from "../Player/APlayer";

export class ClientPowerUpBox extends DisposableMesh implements IPowerUpBox {
    protected observable: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
    public X: number;
    public Z: number;
    public PowerUp: IPowerUp;
    private game: Game;
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

    constructor(game: Game, id: number, x: number, z: number, type?: PowerUpType) {
        let fMeshBuilder = (scene: BABYLON.Scene) => BABYLON.MeshBuilder.CreateBox("PowerUpBox", { width: 1.5, height: 1.5, depth: 1.5 }, scene);
        super(game, fMeshBuilder);
        this.game = game;

        this.ID = id;
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
            this.PowerUp = ClientPowerUpBox.factories[type](game);
        } else {
            const types = Object.keys(ClientPowerUpBox.factories) as PowerUpType[];
            const randomType = types[Math.floor(Math.random() * types.length)];
            this.PowerUp = ClientPowerUpBox.factories[randomType](game);
        }
        
        // Se añade a la lista de PowerUps.
        game.PowerUps.Add(this);
    }

    public PickUp(player: APlayer) {
        if (this.disposed)
            return;

        player.Inventory.PickUpPwrUp(this.PowerUp);
        this.Dispose();
    }

    /**
     * Clear al subscriptions.
     */
    public Dispose(): void {
        super.Dispose();
        this.game.PowerUps.Remove(this);
        this.scene.onBeforeRenderObservable.remove(this.observable);
    }
}
