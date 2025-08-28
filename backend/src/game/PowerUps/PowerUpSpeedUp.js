import { APlayer } from "../Player/APlayer.js";
import { AGame } from "../abstract/AGame.js";

export class PowerUpSpeedUp {
    ImgPath;
    game;

    constructor(game) {
        this.game = game;
        this.ImgPath = "textures/PowerUpSpeedUp.jpg";
    }
    
    /**
     * 
     * @param {APlayer} player 
     */
    UsePowerUp(player) {
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "SpeedUp",
            origin: player.GetName(),
        });
    }
}
