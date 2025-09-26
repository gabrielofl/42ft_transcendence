import { APlayer } from "../Player/APlayer.js";

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
        this.game.MessageBroker.Publish("MassEffect", {
            type: "MassEffect",
            effect: "SpeedDown",
            origin: player.GetName(),
        });
    }
}
