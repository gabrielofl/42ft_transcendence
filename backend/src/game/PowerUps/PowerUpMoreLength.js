import { APlayer } from "../Player/APlayer.js";
import { logToFile } from "../Game/logger.js";

export class PowerUpMoreLength {
    ImgPath;
    game;

    constructor(game) {
        this.game = game;
        this.ImgPath = "textures/PwrUpLong.jpg";
    }
    
    /**
     * 
     * @param {APlayer} player 
     */
    UsePowerUp(player) {
        logToFile("PowerUpMoreLength UsePowerUp Start");
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "MoreLength",
            origin: player.GetName(),
        });
        logToFile("PowerUpMoreLength UsePowerUp End");
    }
}
