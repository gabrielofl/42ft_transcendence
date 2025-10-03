import * as BABYLON from "@babylonjs/core";
import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { PowerUpType } from "@shared/types/messages";
import { ClientGame } from "./ClientGame";
import { DisposableMesh } from "@shared/utils/DisposableMesh";
import { IPowerUpBox } from "@shared/interfaces/IPowerUpBox";
import { AGame } from "@shared/abstract/AGame";
import { APlayer } from "@shared/Player/APlayer";

export class ClientPowerUpBox extends DisposableMesh implements IPowerUpBox {
    protected observable: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
    public X: number;
    public Z: number;
    public PowerUp: IPowerUp;
    private game: ClientGame;
    public ID: number;

    constructor(game: ClientGame, id: number, x: number, z: number, type?: PowerUpType) {
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
            this.PowerUp = AGame.PowerUpFactory[type](game);
        } else {
            const types = Object.keys(AGame.PowerUpFactory) as PowerUpType[];
            const randomType = types[Math.floor(Math.random() * types.length)];
            this.PowerUp = AGame.PowerUpFactory[randomType](game);
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
