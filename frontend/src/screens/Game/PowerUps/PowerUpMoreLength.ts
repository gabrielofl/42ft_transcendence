import { APlayer } from "../Player/APlayer";
import { ClientGame } from "../ClientGame";
import { IPowerUp } from "../Interfaces/IPowerUp";

export class PowerUpMoreLength implements IPowerUp {
    public ImgPath: string;
    private game: ClientGame;

    constructor(game: ClientGame) {
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
