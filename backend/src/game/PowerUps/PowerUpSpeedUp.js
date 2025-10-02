import { APlayer } from "../Player/APlayer.js";
import { logToFile } from "../Game/logger.js";

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
        logToFile("PowerUpSpeedUp UsePowerUp Start");
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "SpeedUp",
            origin: player.GetName(),
        });
        logToFile("PowerUpSpeedUp UsePowerUp End");
    }
}
