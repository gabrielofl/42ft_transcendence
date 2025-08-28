import { APlayer } from "../Player/APlayer.js";

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
        this.game.MessageBroker.Publish("MassEffect", {
            type: "MassEffect",
            effect: "LessLength",
            origin: player.GetName(),
        });
    }
}
