import { APlayer } from "../Player/APlayer.js";

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
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "Shield",
            origin: player.GetName(),
        });
    }
}
