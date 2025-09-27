import { APlayer } from "../Player/APlayer.js";
import { logToFile } from "../Game/logger.js";

export class PowerUpShield {
    ImgPath;
    game;

    constructor(game) {
        this.game = game;
        this.ImgPath = "textures/PowerUpShield.jpg";
    }
    
    /**
     * 
     * @param {APlayer} player 
     */
    UsePowerUp(player) {
        logToFile("PowerUpShield UsePowerUp Start");
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "Shield",
            origin: player.GetName(),
        });
        logToFile("PowerUpShield UsePowerUp End");
    }
}
