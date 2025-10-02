import { APlayer } from "../Player/APlayer";
import { ClientGame } from "../ClientGame";
import { IPowerUp } from "../Interfaces/IPowerUp";

export class PowerUpLessLength implements IPowerUp {
    public ImgPath: string;
    private game: ClientGame;

    constructor(game: ClientGame) {
        this.game = game;
        this.ImgPath = "textures/PwrUpLessLength.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        this.game.MessageBroker.Publish("MassEffect", {
            type: "MassEffect",
            effect: "LessLength",
            origin: player.GetName(),
        });
    }
}
