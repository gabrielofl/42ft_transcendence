import { APlayer } from "../Player/APlayer.js";

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
        this.game.MessageBroker.Publish("SelfEffect", {
            type: "SelfEffect",
            effect: "MoreLength",
            origin: player.GetName(),
        });
    }
}
