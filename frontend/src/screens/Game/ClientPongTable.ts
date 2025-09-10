import { SpotMarker } from "../Player/SpotMarker";
import { PowerUpBox } from "../PowerUps/PowerUpBox";
import { APongTable } from "./APongTable";
import { Game } from "./Game";

export class ClientPongTable extends APongTable {
    private markers: SpotMarker[] = [];
    
    constructor(game: Game, preview: boolean = false) {
        super(game);

        this.mesh.material = game.GetMaterial("PongTable");

        if (preview)
            this.markers = game.Map.spots.map(s => new SpotMarker(game, s));
    }

    public CopyPowerUp(box: PowerUpBox): void {
        new PowerUpBox(this.game,)
    }

    public CreatePowerUp(x: number, z: number): void {
        new PowerUpBox(this.game, x, z);
    }

    public Dispose(): void {
        this.markers.forEach(m => m.Dispose());
        this.markers = [];
        super.Dispose();
    }
}