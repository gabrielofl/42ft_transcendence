import * as BABYLON from "@babylonjs/core";
import { Ball } from "../Collidable/Ball";
import { IPowerUp } from "./IPowerUp";
import { PowerUpMoreLength } from "./PowerUpMoreLength";
import { PowerUpSpeedUp } from "./PowerUpSpeedUp";
import { Zone } from "../Utils/Zone";
import { IMesh } from "../Interfaces/IMesh";
import { PowerUpLessLength } from "./PowerUpLessLength";
import { PowerUpSpeedDown } from "./PowerUpSpeedDown";
import { PowerUpCreateBall } from "./PowerUpCreateBall";
import { Game } from "../Game/Game";
import { PongTable } from "../Game/PongTable";
import { PowerUpShield } from "./PowerUpShield";

export class PowerUpBox extends Zone {
    protected rewardTypes: (() => IPowerUp)[] = [];
    protected observable: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;

    constructor(tableWidth: number, tableHeight: number) {
        super(1.5, 1.5, 1.5);

        // this.rewardTypes.push(() => new PowerUpMoreLength());
        this.rewardTypes.push(() => new PowerUpLessLength());
        // this.rewardTypes.push(() => new PowerUpSpeedUp());
        // this.rewardTypes.push(() => new PowerUpSpeedDown());
        // this.rewardTypes.push(() => new PowerUpCreateBall());
        this.rewardTypes.push(() => new PowerUpShield());

        // Posición aleatoria dentro del campo de juego
        const x = (Math.random() - 0.5) * tableWidth * 0.8;
        const z = (Math.random() - 0.5) * tableHeight * 0.8;
        this.mesh.position.set(x, 1, z);

        // Sobreescribir material de la zona.
        this.mesh.material = Game.GetInstance().GetMaterial("PowerUp");
        
        // Animación visual para destacar el power-up
        this.observable = this.scene.onBeforeRenderObservable.add(() => {
            if (!this.IsDisposed())
                this.mesh.rotation.y += 0.02;
        });
        
        // Se añade a la lista de PowerUps.
        PongTable.PowerUps.Add(this);
        
        // Registrarse a eventos.
        this.OnEnterEvent.Subscribe((iMesh) => this.PickUp(iMesh));
    }

    private PickUp(iMesh: IMesh)
    {
        if (this.disposed)
            return;

        if (iMesh instanceof Ball && iMesh.Owner != null)
        {
            if (iMesh.IsDisposed())
                return;
            
            const index = Math.floor(Math.random() * this.rewardTypes.length);
            iMesh.Owner.Inventory.PickUpPwrUp(this.rewardTypes[index]());
            this.Dispose();
        }
    }

    /**
     * Clear al subscriptions.
     */
    public Dispose(): void {
        super.Dispose();
        this.OnEnterEvent.Clear();
        PongTable.PowerUps.Remove(this);
        this.scene.onBeforeRenderObservable.remove(this.observable);
    }
}
