import { Ball } from "../Collidable/Ball";
import { IMesh } from "../Interfaces/IMesh";
import { GameEvent } from "@shared/types/types";
import { Zone } from "../Utils/Zone";
import { APongTable } from "./APongTable";
import { Game } from "./Game";
import { ServerPowerUpBox } from "../PowerUps/ServerPowerUpBox";

export class ServerPongTable extends APongTable {
    protected gameZone: Zone;

    constructor(game: Game) {
        super(game);

        // Crear PowerUps
        var i = 0;
        while (++i <= this.MAX_POWERUPS) {
            this.SpawnPowerUp();
        }
        game.PowerUps.OnRemoveEvent.Subscribe((pwrUp) => this.SpawnPowerUp());

        this.gameZone = new Zone(game, game.Map.size.width, 10, game.Map.size.height);
        this.gameZone.OnLeaveEvent.Subscribe((iMesh) => this.BallLeaveGameZone(iMesh));

        this.game.MessageBroker.Subscribe(GameEvent.GamePause, (paused: boolean) => game.Paused = paused);
    }

    /**
     * All Balls are subscribed to this method to avoid balls scaping from table.
     * @param iMesh Ball mesh.
     */
    private BallLeaveGameZone(iMesh: IMesh): void {
        if (iMesh instanceof Ball)
            iMesh.Dispose();
    }

    private SpawnPowerUp(): void {
        // Posición aleatoria dentro del campo de juego
        const x = (Math.random() - 0.5) * this.game.Map.size.width * 0.8;
        const z = (Math.random() - 0.5) * this.game.Map.size.height * 0.8;
        this.CreatePowerUp(x, z);
    }
    
    public CreatePowerUp(x: number, z: number): void {
        setTimeout(() => new ServerPowerUpBox(this.game, x, z), 2000);
    }

    public Dispose(): void {
        this.gameZone.Dispose();
        super.Dispose();
    }
}