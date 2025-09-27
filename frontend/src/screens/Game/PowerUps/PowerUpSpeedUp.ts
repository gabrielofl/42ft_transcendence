import { APlayer } from "../Player/APlayer";
import { ClientGame } from "../ClientGame";
import { IPowerUp } from "../Interfaces/IPowerUp";

export class PowerUpSpeedUp implements IPowerUp {
    public ImgPath: string;
    private game: ClientGame;

    constructor(game: ClientGame) {
        this.game = game;
        this.ImgPath = "textures/PowerUpSpeedUp.jpg";
    }
    
    public UsePowerUp(player: APlayer): void {
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "SpeedUp",
            origin: player.GetName(),
        });
    }
}
