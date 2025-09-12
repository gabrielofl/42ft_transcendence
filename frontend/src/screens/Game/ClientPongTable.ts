import { SpotMarker } from "../Player/SpotMarker";
import { ClientPowerUpBox } from "../PowerUps/ClientPowerUpBox";
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

    public CreatePowerUp(id: number, x: number, z: number): void {
        new ClientPowerUpBox(this.game, id, x, z);
    }

    public Dispose(): void {
        this.markers.forEach(m => m.Dispose());
        this.markers = [];
        super.Dispose();
    }
}