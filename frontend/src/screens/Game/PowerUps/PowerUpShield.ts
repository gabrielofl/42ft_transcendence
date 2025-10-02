import { APlayer } from "../Player/APlayer";
import { ClientGame } from "../ClientGame";
import { IPowerUp } from "../Interfaces/IPowerUp";

export class PowerUpShield implements IPowerUp {
    public ImgPath: string;
    private game: ClientGame;

    constructor(game: ClientGame) {
        this.game = game;
        this.ImgPath = "textures/PowerUpShield.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "Shield",
            origin: player.GetName(),
        });
    }
}
