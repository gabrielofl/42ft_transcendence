import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { APlayer } from "../Player/APlayer";
import { AGame } from "../abstract/AGame";

export class PowerUpShield implements IPowerUp {
    public ImgPath: string;
    private game: AGame;

    constructor(game: AGame) {
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
