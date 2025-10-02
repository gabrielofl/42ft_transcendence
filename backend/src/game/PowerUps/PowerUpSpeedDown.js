import { APlayer } from "../Player/APlayer.js";
import { logToFile } from "../Game/logger.js";

export class PowerUpSpeedDown {
    ImgPath;
    game;

    constructor(game) {
        this.game = game;
        this.ImgPath = "textures/PowerUpSpeedDown.jpg";
    }
    
    /**
     * 
     * @param {APlayer} player 
     */
    UsePowerUp(player) {
        logToFile("PowerUpSpeedDown UsePowerUp Start");
        this.game.MessageBroker.Publish("MassEffect", {
            type: "MassEffect",
            effect: "SpeedDown",
            origin: player.GetName(),
        });
        logToFile("PowerUpSpeedDown UsePowerUp End");
    }
}
