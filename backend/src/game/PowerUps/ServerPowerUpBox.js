import * as BABYLON from "@babylonjs/core";
import { ServerBall } from "../Collidable/ServerBall.js";
import { Zone } from "../Utils/Zone.js"
import { logToFile } from "../Game/logger.js";

export class ServerPowerUpBox extends Zone {
    observable;
    X;
    Z;
    PowerUp;
    ID;
    powerUpType;

    constructor(game, x, z, type) {
        logToFile("ServerPowerUpBox Constructor Start");
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
            this.powerUpType = type;
            this.PowerUp = game.PowerUpFactory[type](game);
        } else {
            const types = Object.keys(game.PowerUpFactory);
            const randomType = types[Math.floor(Math.random() * types.length)];
            this.powerUpType = randomType;
            this.PowerUp = game.PowerUpFactory[randomType](game);
        }

        let id = 0;
        let powerUps = game.PowerUps.GetAll();
        while (powerUps.find(p => p.ID === id)) id++;
        this.ID = id;
        
        // Se añade a la lista de PowerUps.
        game.PowerUps.Add(this);
        
        // Registrarse a eventos.
        this.OnEnterEvent.Subscribe((iMesh) => { 
            if (iMesh instanceof ServerBall && !iMesh.IsDisposed() && iMesh.Owner != null)
                this.PickUp(iMesh.Owner);
        });

        // Notificar creación
        game.MessageBroker.Publish("CreatePowerUp", this.GetCreateMessage());
        logToFile("ServerPowerUpBox Constructor End");
    }

    /**
     * Construye un mensaje con la información de creación de este PowerUp.
     * @returns {import("../../../shared/types/messages.js").CreatePowerUpMessage}
     */
    GetCreateMessage() {
        return {
            type: "CreatePowerUp",
            id: this.ID,
            x: this.X,
            z: this.Z,
            powerUpType: this.powerUpType,
        };
    }

    /**
     * 
     * @param {APlayer} player 
     * @returns 
     */
    PickUp(player)
    {
        logToFile("ServerPowerUpBox PickUp Start");
        if (this.disposed)
            return;

        player.Inventory.PickUpPwrUp(this.PowerUp);
        this.game.MessageBroker.Publish("InventoryChanged", {
            type: "InventoryChanged",
            username: player.GetName(),
            id: this.ID,
            path: this.PowerUp.ImgPath,
        });
        this.Dispose();
        logToFile("ServerPowerUpBox PickUp End");
    }

    /**
     * Clear al subscriptions.
     */
    Dispose() {
        super.Dispose();
        this.OnEnterEvent.Clear();
        this.game.PowerUps.Remove(this);
        this.scene.onBeforeRenderObservable.remove(this.observable);
    }
}
