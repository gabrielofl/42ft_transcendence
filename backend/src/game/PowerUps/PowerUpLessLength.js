import { APlayer } from "../Player/APlayer.js";
import { logToFile } from "../Game/logger.js";

export class PowerUpLessLength {
    ImgPath;
    game;

    constructor(game) {
        this.game = game;
        this.ImgPath = "textures/PwrUpLessLength.jpg";
    }
    
    /**
     * 
     * @param {APlayer} player 
     */
    UsePowerUp(player) {
        logToFile("PowerUpLessLength UsePowerUp Start");
        this.game.MessageBroker.Publish("MassEffect", {
            type: "MassEffect",
            effect: "LessLength",
            origin: player.GetName(),
        });
        logToFile("PowerUpLessLength UsePowerUp End");
    }
}
