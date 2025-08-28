import { IPowerUp } from "@shared/interfaces/IPowerUp";
import { APlayer } from "../Player/APlayer";
import { AGame } from "../abstract/AGame";

export class PowerUpMoreLength implements IPowerUp {
    public ImgPath: string;
    private game: AGame;

    constructor(game: AGame) {
        this.game = game;
        this.ImgPath = "textures/PwrUpLong.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "MoreLength",
            origin: player.GetName(),
        });
    }
}
