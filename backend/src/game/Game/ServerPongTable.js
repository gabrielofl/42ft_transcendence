import * as BABYLON from "@babylonjs/core";
import { ServerBall } from "../Collidable/ServerBall.js";
import { ServerPowerUpBox } from "../PowerUps/ServerPowerUpBox.js";
import { ServerWall } from "../Collidable/ServerWall.js";
import { APongTable } from "../abstract/APongTable.js";
import { Zone } from "../Utils/Zone.js";

export class ServerPongTable extends APongTable {
    gameZone;
    game;
    walls;

    constructor(game) {
        super(game);
        
        this.game = game;
        // Crear PowerUps
        var i = 0;
        while (++i <= this.MAX_POWERUPS) {
            this.SpawnPowerUp();
        }
        game.PowerUps.OnRemoveEvent.Subscribe((pwrUp) => this.SpawnPowerUp());

        this.gameZone = new Zone(game, game.Map.size.width, 10, game.Map.size.height);
        this.gameZone.OnLeaveEvent.Subscribe((iMesh) => this.BallLeaveGameZone(iMesh));

        this.walls = game.Map.walls.map(w =>
            new ServerWall(game, w.length, new BABYLON.Vector2(w.position[0], w.position[1]), w.rotation)
        );

        this.game.MessageBroker.Subscribe("GamePause", (msg) => game.Paused = msg.pause);
    }

    /**
     * All Balls are subscribed to this method to avoid balls scaping from table.
     * @param iMesh Ball mesh.
     */
    BallLeaveGameZone(iMesh) {
        if (iMesh instanceof ServerBall)
            iMesh.Dispose();
    }

    SpawnPowerUp() {
        // Posición aleatoria dentro del campo de juego
        const x = (Math.random() - 0.5) * this.game.Map.size.width * 0.8;
        const z = (Math.random() - 0.5) * this.game.Map.size.height * 0.8;
        this.CreatePowerUp(0, x, z);
    }
    
    CreatePowerUp(id, x, z) {
        setTimeout(() => new ServerPowerUpBox(this.game, x, z), 2000);
    }

    Dispose() {
        this.walls.forEach(w => w.Dispose());
        this.walls = [];
        this.gameZone.Dispose();
        super.Dispose();
    }
}